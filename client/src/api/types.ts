/** Mirror of the server response envelope. Keeps client/server contracts in sync. */
export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}
