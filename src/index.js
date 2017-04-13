// @flow
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import thunk from "redux-thunk";
import App from "./App";

import "./index.css";

import { createStore, applyMiddleware, compose } from "redux";
import type { Store } from "redux";
import { validate } from "validated/object";
import { arrayOf, object, string, number, boolean } from "validated/schema";

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
const albumSchema = object({
  userId: number,
  id: number,
  title: string
});

const AlbumsSchema = arrayOf(albumSchema);

const todosSchema = arrayOf(
  object({
    userId: number,
    id: number,
    title: string,
    completed: boolean
  })
);

type State = {
  todos: ?Array<Todo>,
  albums: ?Array<Album>,
  album: ?Album
};

type apiPayload = {
  url: string,
  next: (mixed) => Action
};

/* In reality, these would probably be generic types with error and meta. I'm keeping it
   simple here. */

type Action =
  | { type: "API", payload: apiPayload }
  | { type: "LOADED_TODOS", payload: Array<Todo> }
  | { type: "LOADED_ALBUMS", payload: Array<Album> }
  | { type: "LOADED_ALBUM", payload: Album }
  | { type: "ALBUM_UPDATED", payload: boolean };

export type GetState = () => Object;
export type ThunkAction = (dispatch: Dispatch, getState: GetState) => any;
export type Dispatch = (action: Action | ThunkAction) => any;

const INITIAL_STATE = {
  todos: [],
  albums: [],
  album: undefined
};

const loadedTodos = (payload): Action => {
  const validData: Array<Todo> = validate(todosSchema, payload);
  return {
    type: "LOADED_TODOS",
    payload: validData
  };
};

// function createNextAction(type: string, schema: Node<*>): (mixed) => Action {
//   return function<RT>(payload: mixed): Action {
//     // This throws if validate() fails. Otherwise we get a "good" payload
//     const validData: RT = validate(schema, payload);
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
    next: loadedTodos
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

const apiMiddleware = ({ dispatch }: { dispatch: Dispatch }) =>
  next =>
    action => {
      if (action.type !== "API") {
        return next(action);
      }

      const { payload } = action;

      fetch(BASE_URL + payload.url)
        .then(response => response.json())
        .then(response => dispatch(payload.next(response)))
        .catch(error => {
          console.log("------- CAUGHT ERROR -------");
          console.log(error);
          /* In real app we would call payload.next with an error here */
        });
    };

// const rootReducer = createReducer(INITIAL_STATE, );
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store: Store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk, apiMiddleware))
);

store.dispatch(getTodos());

ReactDOM.render(
  <Provider store={store}><App /></Provider>,
  document.getElementById("root")
);
