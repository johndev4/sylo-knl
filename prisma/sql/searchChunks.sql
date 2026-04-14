SELECT 
  dc.id, 
  dc.content, 
  d.title, 
  (dc.embedding <=> $1::vector(768)) as distance
FROM "DocumentChunk" dc
JOIN "Document" d ON dc."documentId" = d.id
WHERE d."spaceId" = $2::uuid
ORDER BY distance ASC
LIMIT $3::int;
