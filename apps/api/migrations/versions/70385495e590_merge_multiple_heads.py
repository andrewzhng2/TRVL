"""Merge multiple heads

Revision ID: 70385495e590
Revises: 9b1c2d3e4f5a, dd037141663b
Create Date: 2025-10-10 09:34:08.873766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70385495e590'
down_revision: Union[str, Sequence[str], None] = ('9b1c2d3e4f5a', 'dd037141663b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
