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

const albumsSchema = arrayOf(albumSchema);

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

type PayloadSpec<T> = {|
  type: string,
  payload: T | Error,
  error?: boolean,
  meta?: mixed
|};

type apiPayload = {
  url: string,
  next: PayloadSpec<*> => Action
};

type ApiAction = { type: "API", payload?: apiPayload };
type LoadedTodosAction = { type: "LOADED_TODOS", payload?: Array<Todo> };
type loadedAlbumsAction = { type: "LOADED_ALBUMS", payload?: Array<Album> };

type Action = ApiAction | LoadedTodosAction | loadedAlbumsAction;

const getTodos = (): Action => ({
  type: "API",
  payload: {
    url: "todos",
    next: (payload: mixed, error?: boolean, meta?: mixed): Action => ({
      type: "LOADED_TODOS",
      payload: payload instanceof Error
        ? payload
        : validate(todosSchema, payload),
      meta,
      error
    })
  }
});

const getAlbums = (): Action => ({
  type: "API",
  payload: {
    url: "albums",
    next: (payload: mixed, error?: boolean, meta?: mixed): Action => ({
      type: "LOADED_ALBUMS",
      payload: payload instanceof Error
        ? payload
        : validate(albumsSchema, payload),
      meta,
      error
    })
  }
});

export type GetState = () => Object;
export type ThunkAction = (dispatch: Dispatch, getState: GetState) => any;
export type Dispatch = (action: Action | ThunkAction) => any;

const INITIAL_STATE = {
  todos: [],
  albums: [],
  album: undefined
};

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

const apiMiddleware = ({
  dispatch
}: { dispatch: Dispatch }) => next => action => {
  if (action.type !== "API") {
    return next(action);
  }

  const { payload } = action;

  fetch(BASE_URL + payload.url)
    .then(r => r.json())
    .then(r => {
      let action;
      try {
        action = payload.next(r);
      } catch (error) {
        console.log("------- CAUGHT ERROR within nex() -------");
        action = payload.next(error, true);
      }
      dispatch(action);
    })
    .catch(error => {
      console.log("------- CAUGHT ERROR -------");
      payload.next(error, true);
      /* In real app we would call payload.next with an error here */
    });
  return next(action);
};

// const rootReducer = createReducer(INITIAL_STATE, );
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store: Store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk, apiMiddleware))
);

store.dispatch(getTodos());
store.dispatch(getAlbums());

ReactDOM.render(
  <Provider store={store}><App /></Provider>,
  document.getElementById("root")
);
