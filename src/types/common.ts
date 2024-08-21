export interface Result<T> {
  data: T;
  error: { message: string } | null;
}
