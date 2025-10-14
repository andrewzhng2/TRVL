"""add created_by to trips

Revision ID: b7e6c5d4a321
Revises: dd037141663b, cce4df14a696
Create Date: 2025-10-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e6c5d4a321'
down_revision: Union[str, Sequence[str], None] = ('dd037141663b', 'cce4df14a696')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.add_column('trips', sa.Column('created_by', sa.Integer(), nullable=True))
    except Exception:
        pass
    try:
        op.create_foreign_key('trips_created_by_users_fk', 'trips', 'users', ['created_by'], ['id'], ondelete='SET NULL')
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_constraint('trips_created_by_users_fk', 'trips', type_='foreignkey')
    except Exception:
        pass
    try:
        op.drop_column('trips', 'created_by')
    except Exception:
        pass


