"""extend travel segments fields

Revision ID: a1b2c3d4e5f6
Revises: 9b1c2d3e4f5a
Create Date: 2025-10-10 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9b1c2d3e4f5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('travel_segments', sa.Column('title', sa.String(length=200), nullable=False, server_default=''))
    op.add_column('travel_segments', sa.Column('badge', sa.String(length=50), nullable=False, server_default=''))
    op.add_column('travel_segments', sa.Column('start_date', sa.String(length=10), nullable=True))
    op.add_column('travel_segments', sa.Column('end_date', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('travel_segments', 'end_date')
    op.drop_column('travel_segments', 'start_date')
    op.drop_column('travel_segments', 'badge')
    op.drop_column('travel_segments', 'title')


