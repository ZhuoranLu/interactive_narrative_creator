"""
User management repository layer
Handles user-related database operations including authentication, tokens, and preferences
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import hashlib
import bcrypt

from .database import (
    User, TokenTransaction, UserSession, UserPreferences, ProjectCollaborator
)


class UserRepository:
    """Repository for user account management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(
        self, 
        username: str, 
        email: str, 
        password: str, 
        full_name: Optional[str] = None,
        **kwargs
    ) -> User:
        """Create a new user account"""
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user = User(
            username=username,
            email=email.lower(),
            hashed_password=hashed_password,
            full_name=full_name,
            **kwargs
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Create default preferences
        preferences = UserPreferences(user_id=user.id)
        self.db.add(preferences)
        self.db.commit()
        
        return user
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email.lower()).first()
    
    def verify_password(self, user: User, password: str) -> bool:
        """Verify user password"""
        return bcrypt.checkpw(password.encode('utf-8'), user.hashed_password.encode('utf-8'))
    
    def update_password(self, user_id: str, new_password: str) -> bool:
        """Update user password"""
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        result = self.db.query(User).filter(User.id == user_id).update({
            "hashed_password": hashed_password,
            "updated_at": datetime.utcnow()
        })
        
        self.db.commit()
        return result > 0
    
    def update_user(self, user_id: str, **updates) -> Optional[User]:
        """Update user information"""
        updates["updated_at"] = datetime.utcnow()
        
        result = self.db.query(User).filter(User.id == user_id).update(updates)
        
        if result > 0:
            self.db.commit()
            return self.get_user_by_id(user_id)
        return None
    
    def update_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp"""
        self.db.query(User).filter(User.id == user_id).update({
            "last_login_at": datetime.utcnow()
        })
        self.db.commit()
    
    def deactivate_user(self, user_id: str) -> bool:
        """Deactivate user account"""
        result = self.db.query(User).filter(User.id == user_id).update({
            "is_active": False,
            "updated_at": datetime.utcnow()
        })
        self.db.commit()
        return result > 0
    
    def get_users(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> List[User]:
        """Get list of users with pagination"""
        query = self.db.query(User)
        
        if active_only:
            query = query.filter(User.is_active == True)
            
        return query.offset(skip).limit(limit).all()


class TokenRepository:
    """Repository for token/credit management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_balance(self, user_id: str) -> int:
        """Get user's current token balance"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.token_balance if user else 0
    
    def add_tokens(
        self, 
        user_id: str, 
        amount: int, 
        transaction_type: str = "purchase",
        description: Optional[str] = None,
        payment_method: Optional[str] = None,
        payment_reference: Optional[str] = None
    ) -> TokenTransaction:
        """Add tokens to user account"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Update user balance
        new_balance = user.token_balance + amount
        user.token_balance = new_balance
        
        if transaction_type == "purchase":
            user.total_tokens_purchased += amount
        
        # Create transaction record
        transaction = TokenTransaction(
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            balance_after=new_balance,
            description=description,
            payment_method=payment_method,
            payment_reference=payment_reference
        )
        
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        
        return transaction
    
    def consume_tokens(
        self,
        user_id: str,
        amount: int,
        project_id: Optional[str] = None,
        operation_type: Optional[str] = None,
        operation_details: Optional[Dict] = None,
        description: Optional[str] = None
    ) -> Optional[TokenTransaction]:
        """Consume tokens from user account"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Check if user has enough tokens
        if user.token_balance < amount:
            return None  # Insufficient tokens
        
        # Update user balance
        new_balance = user.token_balance - amount
        user.token_balance = new_balance
        user.total_tokens_used += amount
        
        # Create transaction record
        transaction = TokenTransaction(
            user_id=user_id,
            transaction_type="usage",
            amount=-amount,  # Negative for consumption
            balance_after=new_balance,
            project_id=project_id,
            operation_type=operation_type,
            operation_details=operation_details,
            description=description
        )
        
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        
        return transaction
    
    def get_transaction_history(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 50,
        transaction_type: Optional[str] = None
    ) -> List[TokenTransaction]:
        """Get user's token transaction history"""
        query = self.db.query(TokenTransaction).filter(TokenTransaction.user_id == user_id)
        
        if transaction_type:
            query = query.filter(TokenTransaction.transaction_type == transaction_type)
        
        return query.order_by(desc(TokenTransaction.created_at)).offset(skip).limit(limit).all()
    
    def get_usage_stats(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get user's token usage statistics"""
        from_date = datetime.utcnow() - timedelta(days=days)
        
        # Get usage transactions
        usage_transactions = self.db.query(TokenTransaction).filter(
            and_(
                TokenTransaction.user_id == user_id,
                TokenTransaction.transaction_type == "usage",
                TokenTransaction.created_at >= from_date
            )
        ).all()
        
        # Calculate stats
        total_used = sum(abs(t.amount) for t in usage_transactions)
        operations = {}
        
        for transaction in usage_transactions:
            op_type = transaction.operation_type or "unknown"
            if op_type not in operations:
                operations[op_type] = {"count": 0, "tokens": 0}
            operations[op_type]["count"] += 1
            operations[op_type]["tokens"] += abs(transaction.amount)
        
        return {
            "period_days": days,
            "total_tokens_used": total_used,
            "transaction_count": len(usage_transactions),
            "operations_breakdown": operations
        }


class SessionRepository:
    """Repository for user session management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(
        self,
        user_id: str,
        token_hash: str,
        refresh_token_hash: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        device_info: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        location: Optional[Dict] = None
    ) -> UserSession:
        """Create a new user session"""
        if not expires_at:
            expires_at = datetime.utcnow() + timedelta(days=7)  # Default 7 days
        
        session = UserSession(
            user_id=user_id,
            token_hash=token_hash,
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address,
            location=location
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session
    
    def get_session_by_token(self, token_hash: str) -> Optional[UserSession]:
        """Get session by token hash"""
        return self.db.query(UserSession).filter(
            and_(
                UserSession.token_hash == token_hash,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.utcnow()
            )
        ).first()
    
    def update_session_activity(self, session_id: str) -> None:
        """Update session last activity"""
        self.db.query(UserSession).filter(UserSession.id == session_id).update({
            "last_activity": datetime.utcnow()
        })
        self.db.commit()
    
    def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a session"""
        result = self.db.query(UserSession).filter(UserSession.id == session_id).update({
            "is_active": False
        })
        self.db.commit()
        return result > 0
    
    def invalidate_user_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user"""
        result = self.db.query(UserSession).filter(UserSession.user_id == user_id).update({
            "is_active": False
        })
        self.db.commit()
        return result
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        result = self.db.query(UserSession).filter(
            or_(
                UserSession.expires_at <= datetime.utcnow(),
                UserSession.is_active == False
            )
        ).delete()
        self.db.commit()
        return result


class UserPreferencesRepository:
    """Repository for user preferences management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_preferences(self, user_id: str) -> Optional[UserPreferences]:
        """Get user preferences"""
        return self.db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    
    def update_preferences(self, user_id: str, **updates) -> Optional[UserPreferences]:
        """Update user preferences"""
        updates["updated_at"] = datetime.utcnow()
        
        result = self.db.query(UserPreferences).filter(UserPreferences.user_id == user_id).update(updates)
        
        if result > 0:
            self.db.commit()
            return self.get_preferences(user_id)
        return None
    
    def update_ui_preferences(self, user_id: str, theme: str, language: str) -> Optional[UserPreferences]:
        """Update UI preferences"""
        return self.update_preferences(
            user_id,
            theme=theme,
            language=language
        )
    
    def update_ai_preferences(
        self, 
        user_id: str, 
        default_story_style: Optional[str] = None,
        preferred_ai_model: Optional[str] = None,
        creativity_level: Optional[float] = None
    ) -> Optional[UserPreferences]:
        """Update AI generation preferences"""
        updates = {}
        if default_story_style is not None:
            updates["default_story_style"] = default_story_style
        if preferred_ai_model is not None:
            updates["preferred_ai_model"] = preferred_ai_model
        if creativity_level is not None:
            updates["creativity_level"] = creativity_level
        
        return self.update_preferences(user_id, **updates)


class CollaborationRepository:
    """Repository for project collaboration management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def add_collaborator(
        self,
        project_id: str,
        user_id: str,
        role: str = "viewer",
        invited_by: Optional[str] = None,
        permissions: Optional[Dict] = None
    ) -> ProjectCollaborator:
        """Add a collaborator to a project"""
        collaborator = ProjectCollaborator(
            project_id=project_id,
            user_id=user_id,
            role=role,
            invited_by=invited_by,
            permissions=permissions
        )
        
        self.db.add(collaborator)
        self.db.commit()
        self.db.refresh(collaborator)
        
        return collaborator
    
    def get_project_collaborators(self, project_id: str) -> List[ProjectCollaborator]:
        """Get all collaborators for a project"""
        return self.db.query(ProjectCollaborator).filter(
            and_(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.is_active == True
            )
        ).all()
    
    def get_user_collaborations(self, user_id: str) -> List[ProjectCollaborator]:
        """Get all projects where user is a collaborator"""
        return self.db.query(ProjectCollaborator).filter(
            and_(
                ProjectCollaborator.user_id == user_id,
                ProjectCollaborator.is_active == True
            )
        ).all()
    
    def update_collaborator_role(self, project_id: str, user_id: str, role: str) -> bool:
        """Update collaborator role"""
        result = self.db.query(ProjectCollaborator).filter(
            and_(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.user_id == user_id
            )
        ).update({"role": role})
        
        self.db.commit()
        return result > 0
    
    def remove_collaborator(self, project_id: str, user_id: str) -> bool:
        """Remove a collaborator from a project"""
        result = self.db.query(ProjectCollaborator).filter(
            and_(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.user_id == user_id
            )
        ).update({"is_active": False})
        
        self.db.commit()
        return result > 0
    
    def accept_collaboration(self, project_id: str, user_id: str) -> bool:
        """Accept collaboration invitation"""
        result = self.db.query(ProjectCollaborator).filter(
            and_(
                ProjectCollaborator.project_id == project_id,
                ProjectCollaborator.user_id == user_id
            )
        ).update({"accepted_at": datetime.utcnow()})
        
        self.db.commit()
        return result > 0 