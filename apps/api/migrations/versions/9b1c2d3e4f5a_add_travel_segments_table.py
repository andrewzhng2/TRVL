"""add travel segments table

Revision ID: 9b1c2d3e4f5a
Revises: 8a1f3b2b7c1a
Create Date: 2025-10-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b1c2d3e4f5a'
down_revision: Union[str, Sequence[str], None] = '8a1f3b2b7c1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'travel_segments',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
        sa.Column('trip_id', sa.Integer(), nullable=False),
        sa.Column('edge_type', sa.String(length=20), nullable=False),
        sa.Column('from_leg_id', sa.Integer(), nullable=True),
        sa.Column('to_leg_id', sa.Integer(), nullable=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('transport_type', sa.String(length=20), nullable=False, server_default='plane'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_leg_id'], ['trip_legs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_leg_id'], ['trip_legs.id'], ondelete='CASCADE'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('travel_segments')



