import { useState } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
import { useSecurity } from '../context/useSecurity';
import { AddMemberModal } from './AddMemberModal';

export const MembersList = () => {
  const { members } = useSecurity();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bottom-card members-card">
        {/* Header */}
        <div className="members-header">
          <h4 className="members-title">Members</h4>
          <button
            className="see-all-link"
            onClick={() => setIsModalOpen(true)}
            type="button"
            title="Manage Authorized Members"
          >
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Members Avatar List & Add Button */}
        <div className="members-avatar-row">
          {members.slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="member-avatar-wrapper"
              title={`${member.name} (${member.role})`}
            >
              <img
                src={member.avatar}
                alt={member.name}
                className="member-avatar-img"
              />
            </div>
          ))}

          {/* Orange Plus Button */}
          <button
            className="add-member-btn"
            onClick={() => setIsModalOpen(true)}
            title="Enroll New Authorized Member"
            type="button"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Modal */}
      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
