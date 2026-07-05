import { resolveApiBaseUrl } from "../../../frontend/src/api/base_url";

describe("resolveApiBaseUrl", () => {
    it("returns the configured API base URL when provided", () => {
        const baseUrl = resolveApiBaseUrl({
            DEV: false,
            PROD: true,
            VITE_API_BASE_URL: "https://edae-api.onrender.com",
        });

        expect(baseUrl).toBe("https://edae-api.onrender.com");
    });

    it("falls back to localhost during development", () => {
        const baseUrl = resolveApiBaseUrl({
            DEV: true,
            PROD: false,
        });

        expect(baseUrl).toBe("http://localhost:3000");
    });

    it("throws in production when VITE_API_BASE_URL is missing", () => {
        expect(() => resolveApiBaseUrl({
            DEV: false,
            PROD: true,
        })).toThrow("VITE_API_BASE_URL is required in production");
    });
});
