-- CreateTable
CREATE TABLE "favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "visibility" BOOLEAN,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "goal_price" INTEGER,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "plan" CHAR,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "status" CHAR,
    "payment_method" CHAR,
    "last_payment_date" TIMESTAMPTZ(6),
    "next_payment_date" TIMESTAMPTZ(6),
    "auto_renewal" CHAR,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "date" TIMESTAMPTZ(6),
    "description" VARCHAR(300),
    "amount" BIGINT,
    "notes" CHAR,
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6)
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50),
    "runescape_name" VARCHAR(50),
    "membership" INTEGER,
    "email" VARCHAR(50),
    "img" TEXT,
    "password" VARCHAR(50),
    "timezone" VARCHAR,
    "created_at" TIMESTAMP(6),
    "deleted_at" TIME(6),
    "updated_at" TIME(6),
    "firebase_uid" VARCHAR(100),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "party_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "clan_id" INTEGER,
    "creator_id" INTEGER,
    "is_invite_only" BOOLEAN,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("party_id")
);

-- CreateTable
CREATE TABLE "party_items" (
    "id" INTEGER NOT NULL,
    "item_id" INTEGER,
    "party_id" INTEGER,

    CONSTRAINT "party_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_members" (
    "id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "party_id" INTEGER,

    CONSTRAINT "party_members_pkey" PRIMARY KEY ("id")
);
