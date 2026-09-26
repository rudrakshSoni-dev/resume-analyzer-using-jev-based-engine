// shared types between api and web
// placeholder — populated as models are built in later phases

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
  };
}

export interface HealthCheckResponse {
  status: 'ok';
}
