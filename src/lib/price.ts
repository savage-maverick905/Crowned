export function calcAmountKobo(votes: number, pricePerVoteNaira: number) {
  if (!Number.isInteger(votes) || votes < 1 || votes > 100000) throw new Error("Invalid votes");
  if (!Number.isInteger(pricePerVoteNaira) || pricePerVoteNaira < 1) throw new Error("Invalid price");
  return votes * pricePerVoteNaira * 100;
}
