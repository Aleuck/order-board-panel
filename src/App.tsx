import { clsx } from "clsx";
import ms from "ms";
import { nanoid } from "nanoid";
import { useEffect, useReducer, useRef } from "react";
import {
	ConfigSchema,
	type Order,
	type OrderSpawn,
	type OrderStatus,
	type Recipe,
} from "~/types";
import config from "./config.json";

function createOrder(recipe: Recipe): Order {
	const now = Date.now();
	return {
		id: nanoid(4),
		status: "pending",
		createdAt: now,
		expiresAt: now + ms(recipe.timeToComplete),
		recipe,
	};
}

const ProgressBar = ({
	timeToComplete,
	orderStatus,
	createdAt,
	className,
}: {
	timeToComplete: number;
	createdAt: number;
	orderStatus: OrderStatus;
	className?: string;
}) => {
	const elapsed = Date.now() - createdAt;
	return (
		<div className={`w-full h-8 bg-neutral-200 ${className || ""}`}>
			{orderStatus !== "pending" ? (
				<div
					className="h-8"
					style={{
						width: "100%",
						backgroundColor: orderStatus === "expired" ? "red" : "green",
					}}
				></div>
			) : (
				<div
					className="h-8 progress-fill"
					style={{
						animationDuration: `${timeToComplete}ms, ${timeToComplete}ms`,
						animationDelay: `-${elapsed}ms, -${elapsed}ms`,
					}}
				></div>
			)}
		</div>
	);
};

type GameState = {
	orders: Order[];
	points: number;
};

type GameAction =
	| { type: "ADD_ORDER"; order: Order }
	| { type: "REMOVE_ORDER"; id: string }
	| { type: "EXPIRE_ORDER"; id: string }
	| { type: "COMPLETE_ORDER"; id: string };

const OrderCard = ({
	order,
	onClick,
}: {
	order: Order;
	onClick: () => void;
}) => {
	return (
		<button
			type="button"
			className={clsx(
				"w-2xs h-40 relative",
				"grid grid-rows-[30px_1fr_40px_40px] items-center overflow-hidden",
				"bg-neutral-100 border border-gray-700 rounded shadow-md",
				order.status === "pending" &&
					"hover:outline-4 hover:outline-green-800 focus:outline-4 focus:outline-green-800",
				order.status !== "pending" && "pointer-events-none",
				order.status === "expired" && "border-red-800 bg-red-200",
				order.status === "completed" && "border-green-800 bg-green-200",
			)}
			onClick={onClick}
		>
			<ProgressBar
				timeToComplete={ms(order.recipe.timeToComplete)}
				createdAt={order.createdAt}
				className="col-span-full"
				orderStatus={order.status}
			/>
			<h2 className="text-2xl text-center font-bold col-span-full">
				{order.recipe.name}
			</h2>
			<ul className="flex flex-row col-span-full justify-evenly items-center gap-1 px-2">
				{order.recipe.ingredients.map((ingredient, i) => (
					<li
						key={`${i}_${ingredient}`}
						className="text-sm font-bold p-2 bg-neutral-200 rounded-md"
					>
						{ingredient}
					</li>
				))}
			</ul>
			<div className="text-lg text-center font-bold col-span-full">
				{order.recipe.cookType}
			</div>
			{order.status !== "pending" && (
				<div
					className={clsx(
						"absolute inset-0 flex items-center justify-center text-9xl font-bold leading-none backdrop-blur-xs",
						order.status === "completed"
							? "text-green-900 bg-green-900/50"
							: "text-red-900 bg-red-900/50",
					)}
				>
					{order.status === "completed" ? "✓" : "✕"}
				</div>
			)}
		</button>
	);
};

function gameReducer(state: GameState, action: GameAction): GameState {
	switch (action.type) {
		case "ADD_ORDER": {
			return { ...state, orders: [...state.orders, action.order] };
		}
		case "REMOVE_ORDER": {
			const orderIndex = state.orders.findIndex((o) => o.id === action.id);
			if (orderIndex === -1) return state;
			return {
				...state,
				orders: [
					...state.orders.slice(0, orderIndex),
					...state.orders.slice(orderIndex + 1),
				],
			};
		}
		case "COMPLETE_ORDER": {
			const orderIndex = state.orders.findIndex((o) => o.id === action.id);
			if (orderIndex === -1) return state;
			let order = state.orders[orderIndex];
			if (order.status !== "pending") return state;
			order = {
				...state.orders[orderIndex],
				status: "completed",
			};
			const isExpired = Date.now() > order.expiresAt;
			const pointsDelta = isExpired
				? order.recipe.pointsExpired
				: order.recipe.pointsCompleted;
			return {
				...state,
				points: state.points + pointsDelta,
				orders: [
					...state.orders.slice(0, orderIndex),
					order,
					...state.orders.slice(orderIndex + 1),
				],
			};
		}
		case "EXPIRE_ORDER": {
			const orderIndex = state.orders.findIndex((o) => o.id === action.id);
			if (orderIndex === -1) return state;
			const order: Order = { ...state.orders[orderIndex], status: "expired" };
			return {
				...state,
				points: state.points + order.recipe.pointsExpired,
				orders: [
					...state.orders.slice(0, orderIndex),
					order,
					...state.orders.slice(orderIndex + 1),
				],
			};
		}
		default:
			return state;
	}
}

function OrdersBoard({
	recipes,
	sequence,
}: {
	recipes: Map<string, Recipe>;
	sequence: OrderSpawn[];
}) {
	const timeoutMap = useRef(new Map<string, number>());

	function scheduleTimeout(key: string, callback: () => void, delay: number) {
		const handler = setTimeout(() => {
			callback();
			timeoutMap.current.delete(key);
		}, delay);
		timeoutMap.current.set(key, handler);
	}

	const [gameState, dispatch] = useReducer(gameReducer, {
		orders: [],
		points: 0,
	});

	function expireOrder(id: string) {
		dispatch({ type: "EXPIRE_ORDER", id });
		timeoutMap.current.delete(id);
		scheduleTimeout(
			`remove-${id}`,
			() => {
				dispatch({ type: "REMOVE_ORDER", id });
			},
			2000,
		);
	}

	function addOrder(recipe: Recipe) {
		const order = createOrder(recipe);
		dispatch({ type: "ADD_ORDER", order });
		scheduleTimeout(
			order.id,
			() => {
				expireOrder(order.id);
			},
			ms(order.recipe.timeToComplete),
		);
	}

	function completeOrder(id: string) {
		clearTimeout(timeoutMap.current.get(id));
		timeoutMap.current.delete(id);
		dispatch({ type: "COMPLETE_ORDER", id });
		scheduleTimeout(
			`remove-${id}`,
			() => {
				dispatch({ type: "REMOVE_ORDER", id });
			},
			2000,
		);
	}

	useEffect(() => {
		return () => {
			timeoutMap.current.forEach((handler) => {
				clearTimeout(handler);
			});
		};
	}, []);

	return (
		<section id="center">
			<div className="p-2 text-2xl font-bold">Pontos: {gameState.points}</div>
			<div className="p-2 flex gap-2 flex-wrap h-44">
				{gameState.orders.map((order) => (
					<OrderCard
						key={order.id}
						order={order}
						onClick={() => completeOrder(order.id)}
					/>
				))}
			</div>
			<div className="flex gap-2 p-2">
				<button
					type="button"
					className="p-2 bg-blue-900 text-white rounded"
					onClick={() => {
						sequence.forEach(([time, recipeId]) => {
							setTimeout(() => {
								const recipe = recipes.get(recipeId);
								if (recipe) addOrder(recipe);
							}, ms(time));
						});
					}}
				>
					Iniciar Sequência
				</button>
				{Array.from(recipes.entries()).map(([id, recipe]) => (
					<button
						key={id}
						type="button"
						className="p-2 bg-green-900 text-white rounded"
						onClick={() => addOrder(recipe)}
					>
						Pedir {recipe.name}
					</button>
				))}
			</div>
		</section>
	);
}

function App() {
	const parsedConfig = ConfigSchema.safeParse(config);
	const recipes = new Map<string, Recipe>();
	let sequence: OrderSpawn[] = [];

	if (!parsedConfig.success) {
		return (
			<div className="w-screen h-screen flex items-start justify-start p-2">
				<ul className="p-4 bg-red-200 text-red-800 rounded list-disc pl-8">
					{parsedConfig.error.issues.map((issue, index) => (
						<li key={`${issue.path.join(".")}-${index}`}>
							<strong>
								{issue.path
									.map((v) => (typeof v === "number" ? `#${v + 1}` : v))
									.join(" → ")}
							</strong>
							: {issue.message}
						</li>
					))}
				</ul>
			</div>
		);
	} else {
		parsedConfig.data.recipes.forEach((r) => {
			recipes.set(r.id, r);
		});
		sequence = parsedConfig.data.sequence;
	}

	return <OrdersBoard recipes={recipes} sequence={sequence} />;
}

export default App;
