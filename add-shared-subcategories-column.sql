-- Agregar columna shared_subcategories a la tabla categories
-- Esta columna almacena un array de IDs de subcategorías que son compartidas

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS shared_subcategories JSONB DEFAULT '[]'::jsonb;

-- Comentario descriptivo
COMMENT ON COLUMN categories.shared_subcategories IS 'Array de IDs de subcategorías marcadas como gastos compartidos';
