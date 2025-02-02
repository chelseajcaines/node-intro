import express from 'express'
// web framework for Node.js used to build web applications and APIs
import demoUserRouter from './routers/demoUser'
import budgetRouter from './routers/budget'
import incomeRouter from './routers/income'
import userRouter from './routers/user'
import categoryRouter from './routers/categories'
import cookieParser from 'cookie-parser';
import cors from 'cors'
import forgotPasswordRouter from './routers/auth'; // Import the forgot password route
import resetPasswordRouter from './routers/auth'; // Import the reset password route


const PORT = process.env.PORT ?? 5001
// sets the port number on which the server will listen. It uses the value from the 
// environment variable PORT if it is defined; otherwise, it defaults to 5001

const app = express()
// creates an instance of an Express application

app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from this origin
    credentials: true // Allow credentials such as cookies to be sent
}));

app.use(express.json())
app.use(cookieParser());
// adds a middleware to the application that parses incoming requests with JSON payloads. 
// This allows the server to handle JSON data in request bodies


app.use('/api/demoUser', demoUserRouter)
// mounts the userRouter at the /api/user path. Any requests to paths that start 
// with /api/user will be handled by the routes defined in the userRouter

app.use('/api/user', userRouter)

app.use('/api/budget', budgetRouter)

app.use('/api/income', incomeRouter)

app.use('/api/categories', categoryRouter)

// Mount the forgot password and reset password routes
app.use('/api/auth', forgotPasswordRouter); // Mounts the forgot password routes at /api/auth/forgot-password
app.use('/api/auth', resetPasswordRouter); // Mounts the reset password routes at /api/auth/reset-password

/**
 * Exercise:
 * Implement a new data model and corresponding API. At the end of the day you should
 * create a model that interests you, and progresses your project in some way, but if
 * you can't think of anything, try creating a model for a collection of books which
 * may have the following properties:
 *  - ISBN
 *  - title
 *  - author
 *  - etc...
 * and lives at /api/book
 *
 * Whatever you decide be sure to implement the full set of POST, GET, PUT, and DELETE
 * operations assuming that makes sense in your case.
 */

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`) })
// starts the server and makes it listen on the specified port (PORT). When the server starts, it logs a 
// message to the console indicating that it is running and the port number it is listening on
