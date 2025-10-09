"""add scheduled events table

Revision ID: 8a1f3b2b7c1a
Revises: 627f9b007ff0
Create Date: 2025-10-09 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a1f3b2b7c1a'
down_revision: Union[str, Sequence[str], None] = '627f9b007ff0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'scheduled_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('trip_id', sa.Integer(), nullable=False),
        sa.Column('card_id', sa.Integer(), nullable=False),
        sa.Column('day_index', sa.Integer(), nullable=False),
        sa.Column('hour', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['card_id'], ['backlog_cards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_unique_constraint('uq_schedule_slot', 'scheduled_events', ['trip_id', 'day_index', 'hour'])


def downgrade() -> None:
    op.drop_constraint('uq_schedule_slot', 'scheduled_events', type_='unique')
    op.drop_table('scheduled_events')


