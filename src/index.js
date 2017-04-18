// @flow
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import thunk from "redux-thunk";

import { createStore, applyMiddleware, compose } from "redux";
import type { Store } from "redux";
import { validate } from "validated/object";
import { arrayOf, object, string, number, boolean } from "validated/schema";

import App from "./App";

import "./index.css";

type Todo = {
  userId: number,
  id: number,
  title: string,
  completed: boolean
};

type Album = {
  userId: number,
  id: number,
  title: string
};

/* Validation schemas for validating a server response payload */
// const albumSchema = object({
//   userId: number,
//   id: number,
//   title: string
// });

// const AlbumsSchema = arrayOf(albumSchema);

const todosSchema = arrayOf(
  object({
    userId: number,
    id: number,
    title: string,
    completed: boolean
  })
);

type State = {
  +todos: ?Array<Todo>,
  +albums: ?Array<Album>,
  +album: ?Album
};

/* In reality, these would probably be generic types with error and meta. I'm keeping it
   simple here. */

// type ActionType =
//   | "API"
//   | "LOADED_TODOS"
//   | "LOADED_ALBUMS"
//   | "LOADED_ALBUM"
//   | "ALBUM_UPDATED";
//
// type ActionT<A: ActionType, P> = {|
//   type: A,
//   payload?: P | Error,
//   error?: boolean,
//   meta?: mixed
// |};

// type ActionT = {
//   type: string,
//   payload?: mixed | Error,
//   error?: boolean,
//   meta?: mixed
// };

// type PayloadType = { todos: Array<Todo> } | apiPayload;
type apiPayload = {
  url: string,
  next: Function
};

type ApiAction = { type: "API", payload: apiPayload };
type LoadedTodosAction = { type: "LOADED_TODOS", payload: Array<Todo> };

type Action = ApiAction | LoadedTodosAction;

// type NextFunc = mixed => Action;

// type Action =
//   | { type: "API", payload: apiPayload }
//   | { type: "LOADED_TODOS", payload: Array<Todo> }
// | { type: "LOADED_ALBUMS", payload: Array<Album> }
// | { type: "LOADED_ALBUM", payload: Album }
// | { type: "ALBUM_UPDATED", payload: boolean };

export type ThunkAction = (dispatch: Dispatch, getState: GetState) => any; // eslint-disable-line
export type GetState = () => Object;
export type Dispatch = (action: Action | ThunkAction) => any;

const INITIAL_STATE = {
  todos: [],
  albums: [],
  album: undefined
};

// const loadedTodos = (payload: mixed): LoadedTodosAction => {
//   const validData: Array<Todo> = validate(todosSchema, payload);
//   return {
//     type: "LOADED_TODOS",
//     payload: validData
//   };
// // };
//

function mockValidate(schema, payload): Array<Todo> {
  return [{ userId: 5, id: 5, title: "blaa", completed: true }];
}

function loadedTodos2<T, X>(s: string) {
  return function foo(payload: mixed): T {
    const validData: X = mockValidate(todosSchema, payload);
    return {
      type: s,
      payload: X
    };
  };
}

// function myValidate<RT>(schema, payload: mixed): RT {
//   const f: RT = validate(schema, payload);
//   return f;
// }

// function createNextAction<P, T: Action>(
//   type: string,
//   schema: Node<*>
// ): NextFunc {
//   return function(payload: mixed): T {
//     // This throws if validate() fails. Otherwise we get a "good" payload
//     const validData: P = myValidate(schema, payload);
//     return {
//       type,
//       validData
//     };
//   };
// }

// function createNextAction<T: Action>(type: Action, schema: Node<*>): MAG {
//   return function(payload: mixed): T {
//     // This throws if validate() fails. Otherwise we get a "good" payload
//     const validData: PayloadType = validate(schema, payload);
//     return {
//       type,
//       payload: validData
//     };
//   };
// }

const getTodos = (): Action => ({
  type: "API",
  payload: {
    url: "todos",
    next: loadedTodos2("LOADED_TODOS")
  }
});

/* GOAL: "clone" API call functions:

  const getAlbums = (): Action => ({
    type: "API",
    payload: {
      url: "albums",
      next: createNextAction("LOADED_ALBUMS", albumsSchema)
    }
  })

  const getAlbums = (id: number): Action => ({
    type: "API",
    payload: {
      url: `album/${id}`,
      next: createNextAction("LOADED_ALBUM", albumSchema)
    }
  })

  const updateAlbum = (id: number, title: string): Action => ({
    type: "API",
    payload: {
      url: `album/${id}`,
      next: createNextAction("ALBUM_UPDATED", object({ status: boolean })),
      method: "POST"
    }
  })

*/

export default function createReducer(initialState: ?{}, handlers: {}) {
  return function reducer(
    state: ?{} = initialState,
    action: { type: string, payload: Object, error?: boolean, meta?: mixed }
  ) {
    return typeof handlers[action.type] === "function"
      ? handlers[action.type](state, action)
      : state;
  };
}

const rootReducer = (state: State = INITIAL_STATE, action: Action) => {
  switch (action.type) {
    case "LOADED_TODOS":
      return { ...state, todos: action.payload };
    case "LOADED_ALBUMS":
      /* In real app, we would check action.error here */
      return { ...state, albums: action.payload };
    case "LOADED_ALBUM":
      return { ...state, album: action.payload };

    default:
      return state;
  }
};

const BASE_URL = "https://jsonplaceholder.typicode.com/";

const response = {
  json() {
    console.log("json called");
    return [
      {
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false
      },
      {
        userId: 1,
        id: 2,
        title: "quis ut nam facilis et officia qui",
        completed: false
      }
    ];
  }
};

function mockFetch(url: string): Promise<*> {
  console.log(`Fetching ${url}`);
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(response);
    }, 2500);
  });
}

const apiMiddleware = ({
  dispatch
}: { dispatch: Dispatch }) => next => action => {
  if (action.type !== "API") {
    return next(action);
  }

  const { payload } = action;

  mockFetch(BASE_URL + payload.url)
    .then(r => r.json())
    .then(r => dispatch(payload.next(r)))
    .catch(error => {
      console.log("------- CAUGHT ERROR -------");
      console.log(error);
      /* In real app we would call payload.next with an error here */
    });
  return next(action);
};

// const rootReducer = createReducer(INITIAL_STATE, );
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose; //eslint-disable-line
const store: Store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk, apiMiddleware))
);

store.dispatch(getTodos());

ReactDOM.render(
  <Provider store={store}><App /></Provider>,
  document.getElementById("root")
);
