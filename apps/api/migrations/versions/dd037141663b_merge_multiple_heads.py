"""Merge multiple heads

Revision ID: dd037141663b
Revises: 5f2cd47a591b, 8a1f3b2b7c1a
Create Date: 2025-10-09 15:52:57.102470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd037141663b'
down_revision: Union[str, Sequence[str], None] = ('5f2cd47a591b', '8a1f3b2b7c1a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
