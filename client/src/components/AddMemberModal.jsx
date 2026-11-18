import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const AddMemberModal = ({ isOpen, onClose }) => {
  const { addMember } = useSecurity();
  const [name, setName] = useState('');
  const [role, setRole] = useState('Family Member');
  const [avatarUrl, setAvatarUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    addMember({
      name,
      role,
      avatar: avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });

    setName('');
    setRole('Family Member');
    setAvatarUrl('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content add-member-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <UserPlus size={20} className="modal-icon-orange" />
            <h3>Enroll Authorized Member</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <p className="modal-description">
          Add an authorized household member or security personnel to whitelist them from the Deep Learning intruder alert trigger.
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Jordan Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Role / Authorization Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="form-select"
            >
              <option value="Family Member">Family Member</option>
              <option value="Resident">Resident</option>
              <option value="Security Guard">Security Staff</option>
              <option value="Authorized Guest">Authorized Guest</option>
              <option value="Service Staff">Service Staff</option>
            </select>
          </div>

          <div className="form-group">
            <label>Photo URL (Face Recognition Whitelist)</label>
            <input
              type="url"
              placeholder="https://... (Leave empty for generated avatar)"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Enroll Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
