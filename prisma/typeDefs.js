import {PrismaClient} from "@prisma/client";
import moment from 'moment';

const prisma = new PrismaClient();

export const typeDefs = `
  scalar DateTime

  type User {
  name: String
  firebase_uid: String
  runescape_name: String
  membership: Int
  email: String
  img: String
  password: String
  timezone: String
  created_at: DateTime
  deleted_at: DateTime
  updated_at: DateTime
}
  
  type Transaction {
    transaction_id: Int
    user_id: Int
    date: DateTime
    description: String
    amount: Int
    notes: String
    created_at: DateTime
    updated_at: DateTime
    deleted_at: DateTime
  }

 type Query {
  users: [User]
  user(id: Int): User
}

type Mutation {
  createUser(
    name: String
    firebase_uid: String
    runescape_name: String
    membership: Int
    email: String
    img: String
    password: String
    timezone: String
  ): User
}
`;


export const resolvers = {

    Query: {
        async users() {
            const users = await prisma.users.findMany();
            console.log("users", users);
            return users;
        },
        async user(_, {id}, ctx) {
            return await prisma.users.findOne({
                where: {
                    id: id
                }
            });
        }
    },

    Mutation: {
        async createUser(_, args) {
            console.log("payload:", args.firebase_uid);
            // Connect to the Prisma Client
            try {
                await prisma.$connect();
                await prisma.users.create({
                    data: {
                        name: args.name,
                        firebase_uid: args.firebase_uid,
                        runescape_name: args.runescape_name,
                        membership: args.membership,
                        email: args.email,
                        img: args.img,
                        password: args.password,
                        timezone: args.timezone,
                        created_at: moment().utc().toISOString()
                    }
                });
            } catch (error) {
                console.error("failed to create user", error)
            }
        }
    }
};
