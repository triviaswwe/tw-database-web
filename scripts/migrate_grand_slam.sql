-- 1. Create championship_titles table
CREATE TABLE IF NOT EXISTS championship_titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  championship_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE
);

-- 2. Update championships table
ALTER TABLE championships
ADD COLUMN type VARCHAR(20) NULL;

-- Example classifications (you might need to adjust these based on your DB IDs):
-- UPDATE championships SET type = 'main' WHERE title_name LIKE '%WWE Championship%' OR title_name LIKE '%World Heavyweight Championship%';
-- UPDATE championships SET type = 'mid' WHERE title_name LIKE '%Intercontinental Championship%' OR title_name LIKE '%United States Championship%';
-- UPDATE championships SET type = 'tag' WHERE title_name LIKE '%Tag Team Championship%';
