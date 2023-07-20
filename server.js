// index.js
import {ApolloServer} from "apollo-server-express";
import express from "express";
import {resolvers, typeDefs} from "./prisma/typeDefs.js";
import dotenv from "dotenv"; // Import the dotenv package

dotenv.config();

async function startServer() {
    const app = express();

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        playground: true,
    });

    await server.start();

    server.applyMiddleware({app});

    const port = 4000;

    app.listen(port, () => {
        console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`);
    });
}

startServer();
