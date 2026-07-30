declare module "opossum" {
  class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
    constructor(fn: T, options?: any);
    fire(...args: Parameters<T>): Promise<ReturnType<T>>;
    on(event: string, handler: (...args: any[]) => void): void;
  }

  export default CircuitBreaker;
}
