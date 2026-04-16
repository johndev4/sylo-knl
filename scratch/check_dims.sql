SELECT vector_dims(embedding), count(*) FROM "DocumentChunk" GROUP BY vector_dims(embedding);
