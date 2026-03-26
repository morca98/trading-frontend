CREATE TABLE `dailyStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`totalPnl` decimal(12,4) NOT NULL DEFAULT '0',
	`totalSignals` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyStats_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`signal` enum('BUY','SELL') NOT NULL,
	`confidence` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`rsi` decimal(8,2),
	`adx` decimal(8,2),
	`macroTrend` varchar(20),
	`trendShort` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `symbols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`region` varchar(10) NOT NULL DEFAULT 'US',
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `symbols_id` PRIMARY KEY(`id`),
	CONSTRAINT `symbols_symbol_unique` UNIQUE(`symbol`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tradeId` varchar(64) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`signal` enum('BUY','SELL') NOT NULL,
	`entryPrice` decimal(12,2) NOT NULL,
	`stopLoss` decimal(12,2) NOT NULL,
	`takeProfit` decimal(12,2) NOT NULL,
	`slPct` decimal(8,4) NOT NULL,
	`tpPct` decimal(8,4) NOT NULL,
	`confidence` int NOT NULL,
	`rsi` decimal(8,2),
	`adx` decimal(8,2),
	`atr` decimal(12,2),
	`macroTrend` varchar(20),
	`trendShort` varchar(20),
	`outcome` enum('OPEN','WIN','LOSS') NOT NULL DEFAULT 'OPEN',
	`exitPrice` decimal(12,2),
	`pnl` decimal(8,4),
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`),
	CONSTRAINT `trades_tradeId_unique` UNIQUE(`tradeId`)
);
