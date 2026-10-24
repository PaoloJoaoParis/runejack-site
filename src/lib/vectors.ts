// Calculs sur les embeddings, sans dépendance : testables seuls

// Ramène un vecteur à une longueur de 1. Gemini le demande quand on garde moins de 3072 dimensions,
// et la similarité cosinus devient alors un simple produit scalaire.
export function normalize(vector: number[]): number[] {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length === 0 ? vector : vector.map((value) => value / length);
}

// Similarité cosinus entre deux vecteurs : 1 = même sens, 0 = sans rapport
export function cosineSimilarity(a: number[], b: number[]): number {
  const [na, nb] = [normalize(a), normalize(b)];
  return na.reduce((sum, value, index) => sum + value * nb[index], 0);
}
