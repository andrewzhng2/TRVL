"""add trip_users and invite_code on trips

Revision ID: f1e2d3c4b5a6
Revises: b7e6c5d4a321
Create Date: 2025-10-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import secrets


# revision identifiers, used by Alembic.
revision: str = 'f1e2d3c4b5a6'
down_revision: Union[str, Sequence[str], None] = 'b7e6c5d4a321'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add invite_code to trips
    try:
        op.add_column('trips', sa.Column('invite_code', sa.String(length=64), nullable=False, server_default=''))
        op.alter_column('trips', 'invite_code', server_default=None)
    except Exception:
        pass

    # Create trip_users table
    op.create_table(
        'trip_users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trip_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trip_id', 'user_id', name='uq_trip_user'),
    )

    # Backfill invite codes for existing trips
    conn = op.get_bind()
    try:
        rows = list(conn.execute(sa.text('SELECT id, invite_code FROM trips')))
        for row in rows:
            trip_id = row[0]
            code = row[1] or secrets.token_urlsafe(12)
            conn.execute(sa.text('UPDATE trips SET invite_code = :code WHERE id = :id'), {'code': code, 'id': trip_id})
    except Exception:
        pass


def downgrade() -> None:
    """Downgrade schema."""
    try:
        op.drop_table('trip_users')
    except Exception:
        pass
    try:
        op.drop_column('trips', 'invite_code')
    except Exception:
        pass
