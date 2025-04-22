declare namespace Express {
    export interface Request {
      user?: any; // Define the type of user if you know it (e.g., { id: number; email: string; })
    }
  }