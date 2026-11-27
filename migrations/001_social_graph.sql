BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS followers_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INT NOT NULL DEFAULT 0;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS follows (
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS likes (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS posts_user_created_at_id_idx
  ON posts (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_id_idx
  ON posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS follows_follower_created_at_idx
  ON follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS follows_following_created_at_idx
  ON follows (following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS likes_post_created_at_idx
  ON likes (post_id, created_at DESC);

UPDATE users AS account
SET followers_count = (
      SELECT COUNT(*)::INT
      FROM follows
      WHERE following_id = account.id
    ),
    following_count = (
      SELECT COUNT(*)::INT
      FROM follows
      WHERE follower_id = account.id
    );

UPDATE posts AS publication
SET likes_count = (
  SELECT COUNT(*)::INT
  FROM likes
  WHERE post_id = publication.id
);

COMMIT;
