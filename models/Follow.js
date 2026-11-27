import withTransaction from "./transaction.js";

export async function setFollow({ followerId, followingId, following }) {
  if (followerId === followingId) {
    return { selfFollow: true };
  }

  return withTransaction(async (client) => {
    const lockedUsers = await client.query(
      `SELECT id
       FROM users
       WHERE id = ANY($1::bigint[])
       ORDER BY id
       FOR UPDATE`,
      [[followerId, followingId]],
    );
    if (lockedUsers.rowCount !== 2) {
      return null;
    }

    let changed = false;
    if (following) {
      const inserted = await client.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, following_id) DO NOTHING
         RETURNING follower_id`,
        [followerId, followingId],
      );
      changed = inserted.rowCount > 0;
    } else {
      const deleted = await client.query(
        `DELETE FROM follows
         WHERE follower_id = $1 AND following_id = $2
         RETURNING follower_id`,
        [followerId, followingId],
      );
      changed = deleted.rowCount > 0;
    }

    if (changed) {
      const delta = following ? 1 : -1;
      await client.query(
        `UPDATE users
         SET following_count = GREATEST(following_count + $2, 0)
         WHERE id = $1`,
        [followerId, delta],
      );
      await client.query(
        `UPDATE users
         SET followers_count = GREATEST(followers_count + $2, 0)
         WHERE id = $1`,
        [followingId, delta],
      );
    }

    const { rows } = await client.query(
      `SELECT
         (SELECT followers_count FROM users WHERE id = $2) AS target_followers_count,
         (SELECT following_count FROM users WHERE id = $1) AS current_user_following_count`,
      [followerId, followingId],
    );
    return {
      selfFollow: false,
      isFollowing: following,
      targetFollowersCount: rows[0].target_followers_count,
      currentUserFollowingCount: rows[0].current_user_following_count,
    };
  });
}
