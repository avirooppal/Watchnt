export type Success<T> = {
  ok: true;
  value: T;
};

export type Failure<E = Error> = {
  ok: false;
  error: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function failure<E = Error>(error: E): Failure<E> {
  return { ok: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok === true;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.ok === false;
}
