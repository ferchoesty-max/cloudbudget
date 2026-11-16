INSERT INTO users (full_name, email) VALUES
  ('Daniel Tolentino', 'daniel@cloudbudget.test'),
  ('Eladio Compañero', 'eladio@cloudbudget.test'),
  ('Puga Integrante', 'puga@cloudbudget.test')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (user_id, name, type)
SELECT u.id, v.name, v.type
FROM users u
JOIN (VALUES
  ('daniel@cloudbudget.test', 'Beca y Proyectos', 'income'),
  ('daniel@cloudbudget.test', 'Alimentación', 'expense'),
  ('daniel@cloudbudget.test', 'Transporte Campus', 'expense'),
  ('daniel@cloudbudget.test', 'Internet y Nube', 'expense'),
  ('eladio@cloudbudget.test', 'Sueldo Medio Tiempo', 'income'),
  ('eladio@cloudbudget.test', 'Comida', 'expense')
) AS v(email, name, type) ON u.email = v.email
ON CONFLICT (user_id, name, type) DO NOTHING;

INSERT INTO transactions (user_id, category_id, type, amount, description, occurred_on)
SELECT u.id, c.id, v.type, v.amount, v.description, v.occurred_on::date
FROM (VALUES
  ('daniel@cloudbudget.test', 'Beca y Proyectos', 'income', 8500.00, 'Pago mensual beca y soporte web', '2026-11-01'),
  ('daniel@cloudbudget.test', 'Alimentación', 'expense', 1450.50, 'Despensa quincenal supermercado', '2026-11-03'),
  ('daniel@cloudbudget.test', 'Transporte Campus', 'expense', 620.00, 'Pasajes camión Salamanca - DICIS', '2026-11-05'),
  ('daniel@cloudbudget.test', 'Internet y Nube', 'expense', 499.00, 'Recibo de fibra óptica casa', '2026-11-07')
) AS v(email, cat_name, type, amount, description, occurred_on)
JOIN users u ON u.email = v.email
JOIN categories c ON c.user_id = u.id AND c.name = v.cat_name AND c.type = v.type
WHERE NOT EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.user_id = u.id AND t.description = v.description AND t.occurred_on = v.occurred_on::date
);

INSERT INTO budgets (user_id, category_id, month, limit_amount)
SELECT u.id, c.id, '2026-11', v.limit_amount
FROM (VALUES
  ('daniel@cloudbudget.test', 'Alimentación', 3000.00),
  ('daniel@cloudbudget.test', 'Transporte Campus', 1200.00),
  ('daniel@cloudbudget.test', 'Internet y Nube', 800.00)
) AS v(email, cat_name, limit_amount)
JOIN users u ON u.email = v.email
JOIN categories c ON c.user_id = u.id AND c.name = v.cat_name AND c.type = 'expense'
ON CONFLICT (user_id, category_id, month) DO NOTHING;