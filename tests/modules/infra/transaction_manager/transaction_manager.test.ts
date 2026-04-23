import { Pool, PoolClient } from "pg";
import { TransactionManager } from "../../../../src/modules/infra/transaction_manager/transaction_manager.implementation";
import { AppError } from "../../../../src/modules/errors/errors.global";

describe("TransactionManager Unit Tests", () => {
  let pool: jest.Mocked<Pool>;
  let client: jest.Mocked<PoolClient>;
  let transactionManager: TransactionManager;

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    pool = {
      connect: jest.fn().mockResolvedValue(client),
    } as any;

    transactionManager = TransactionManager.create(pool);
  });

  it("should successfully run a transaction and commit", async () => {
    const callback = jest.fn().mockResolvedValue("success");

    const result = await transactionManager.runInTransaction(callback);

    expect(result).toBe("success");
    expect(pool.connect).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(callback).toHaveBeenCalledWith(client);
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  it("should rollback and throw AppError if callback throws AppError", async () => {
    const appError = new AppError("Test error", 400, "Module.action");
    const callback = jest.fn().mockRejectedValue(appError);

    try {
      await transactionManager.runInTransaction(callback);
      fail("Should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(AppError);
      expect(e.message).toBe("Test error");
      expect(e.statusCode).toBe(400);
      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalled();
    }
  });

  it("should rollback and throw mapped 500 AppError if callback throws generic Error", async () => {
    const genericError = new Error("Database failed");
    const callback = jest.fn().mockRejectedValue(genericError);

    try {
      await transactionManager.runInTransaction(callback);
      fail("Should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(AppError);
      expect(e.statusCode).toBe(500);
      expect(e.message).toBe("Something went wrong. Please try again later.");
      expect(e.originalErrorMessage).toBe("Database failed");
      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalled();
    }
  });

  it("should rethrow unknown errors that are not instances of AppError or Error", async () => {
    const callback = jest.fn().mockRejectedValue("string error");

    try {
      await transactionManager.runInTransaction(callback);
      fail("Should have thrown");
    } catch (e: any) {
      expect(e).toBe("string error");
      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
      expect(client.release).toHaveBeenCalled();
    }
  });
});
