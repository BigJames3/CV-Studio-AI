process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-min-32-characters!!';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-min-32-characters!';
process.env.ENCRYPTION_KEY ??= 'test-encryption-key-min-32-characters!!';
