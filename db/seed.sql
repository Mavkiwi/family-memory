-- Family Memory — Seed Data
-- 10 questions across 5 themes + default admin user

-- Default admin (PIN: 1234 — change in production via wrangler secret)
-- PIN hash is SHA-256 of "1234" (will be validated via Web Crypto at runtime)
INSERT OR IGNORE INTO admin_users (id, name, pin_hash) VALUES
  (1, 'Jeff', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');

-- Childhood theme
INSERT INTO questions (text, theme, follow_up, sort_order) VALUES
  ('What is your earliest childhood memory?', 'childhood', 'What feelings does that memory bring up?', 1),
  ('What games did you play as a child, and who did you play with?', 'childhood', 'Do any of those games still exist today?', 2);

-- Family theme
INSERT INTO questions (text, theme, follow_up, sort_order) VALUES
  ('Tell us about a family tradition that was important to you growing up.', 'family', 'Have you carried that tradition forward?', 3),
  ('Who in our family has influenced you the most, and how?', 'family', 'What did they teach you that you still carry today?', 4);

-- Career theme
INSERT INTO questions (text, theme, follow_up, sort_order) VALUES
  ('What was your very first job, and what did you learn from it?', 'career', 'Would you recommend that kind of work to a young person today?', 5),
  ('What moment in your career are you most proud of?', 'career', 'What made that achievement possible?', 6);

-- Wisdom theme
INSERT INTO questions (text, theme, follow_up, sort_order) VALUES
  ('What advice would you give to your younger self?', 'wisdom', 'Is there something you wish you had done differently?', 7),
  ('What do you believe is the most important thing in life?', 'wisdom', 'Has that belief changed over the years?', 8);

-- Traditions theme
INSERT INTO questions (text, theme, follow_up, sort_order) VALUES
  ('What is your favourite family recipe, and where did it come from?', 'traditions', 'Can you walk us through how to make it?', 9),
  ('How did your family celebrate holidays when you were young?', 'traditions', 'Which holiday was your favourite and why?', 10);
