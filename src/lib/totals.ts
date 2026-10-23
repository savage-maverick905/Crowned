import { Player, Transaction } from "@/models";
export async function playerTotals(pollId: any) {
  const players = await Player.find({ pollId }).lean();
  const real = await Transaction.aggregate([{ $match: { pollId, status: "success" } },
    { $group: { _id: "$playerId", votes: { $sum: "$votes" }, revenueKobo: { $sum: "$amountKobo" }, count: { $sum: 1 } } }]);
  const m = new Map(real.map((r: any) => [String(r._id), r]));
  return players.map((p: any) => {
    const r: any = m.get(String(p._id)) || { votes: 0, revenueKobo: 0, count: 0 };
    return { id: String(p._id), name: p.name, edition: p.edition, imageUrl: p.imageUrl, bio: p.bio, realVotes: r.votes, seededVotes: p.seededVotes,
      total: r.votes + p.seededVotes, revenueKobo: r.revenueKobo, transactions: r.count };
  }).sort((a, b) => b.total - a.total);
}
