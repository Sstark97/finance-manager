export class ForwardFilledSeries {
  private readonly sortedBucketKeys: number[];

  constructor(
    private readonly closeByBucket: Map<number, number>,
    private readonly fallbackClose: number,
  ) {
    this.sortedBucketKeys = Array.from(closeByBucket.keys()).sort((first, second) => first - second);
  }

  closeAt(bucketKey: number): number {
    const mostRecentKeyAtOrBefore = this.mostRecentKeyAtOrBefore(bucketKey);
    if (mostRecentKeyAtOrBefore === undefined) return this.fallbackClose;
    return this.closeByBucket.get(mostRecentKeyAtOrBefore) ?? this.fallbackClose;
  }

  private mostRecentKeyAtOrBefore(bucketKey: number): number | undefined {
    let low = 0;
    let high = this.sortedBucketKeys.length - 1;
    let result: number | undefined;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidateKey = this.sortedBucketKeys[middle];
      if (candidateKey <= bucketKey) {
        result = candidateKey;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return result;
  }
}
