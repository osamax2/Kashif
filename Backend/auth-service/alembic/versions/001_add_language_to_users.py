"""add language to users

Revision ID: 001
Revises: 
Create Date: 2025-11-27 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add language column with default value 'ar'
    op.add_column('users', sa.Column('language', sa.String(length=2), nullable=False, server_default='ar'))


def downgrade() -> None:
    # Remove language column
    op.drop_column('users', 'language')
