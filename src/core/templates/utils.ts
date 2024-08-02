export function reshape(array: number[], dimensions: number[]): any {
  if (dimensions.length === 0) {
    return array[0];
  }

  const [first, ...rest] = dimensions;
  const size = rest.reduce((a, b) => a * b, 1);

  const result = [];
  for (let i = 0; i < first; i++) {
    result.push(reshape(array.slice(i * size, (i + 1) * size), rest));
  }

  return result;
}

export function flatten(array: any): number[] {
  if (!Array.isArray(array)) {
    return [array];
  }

  return array.reduce((acc, value) => {
    return acc.concat(flatten(value));
  }, []);
}
