USE b2b;

INSERT INTO customers (name, email, phone)
VALUES ('Cliente Demo', 'demo@cliente.com', '+593999000000');

INSERT INTO products (sku, name, price_cents, stock)
VALUES
('SKU-001', 'Laptop Pro', 129900, 10),
('SKU-002', 'Monitor 27', 99900, 5);
