import withTransaction from "./transaction.js";

export async function togglePostLike({ userId, postId }) {
  return withTransaction(async (client) => {
    const post = await client.query(
      "SELECT id FROM posts WHERE id = $1 FOR UPDATE",
      [postId],
    );
    if (post.rowCount === 0) {
      return null;
    }

    const inserted = await client.query(
      `INSERT INTO likes (user_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, post_id) DO NOTHING
       RETURNING user_id`,
      [userId, postId],
    );
    if (inserted.rowCount > 0) {
      await client.query(
        "UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1",
        [postId],
      );
      return true;
    }

    const deleted = await client.query(
      `DELETE FROM likes
       WHERE user_id = $1 AND post_id = $2
       RETURNING user_id`,
      [userId, postId],
    );
    if (deleted.rowCount > 0) {
      await client.query(
        "UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1",
        [postId],
      );
    }
    return false;
  });
}
