"""Merge multiple heads

Revision ID: cce4df14a696
Revises: 70385495e590, a1b2c3d4e5f6
Create Date: 2025-10-10 10:32:37.128273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cce4df14a696'
down_revision: Union[str, Sequence[str], None] = ('70385495e590', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
