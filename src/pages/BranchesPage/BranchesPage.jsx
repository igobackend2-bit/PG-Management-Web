import React from "react";
import { useNavigate } from "react-router-dom";
import { BranchesGridView } from "../../components/BranchesGridView/BranchesGridView";
import Modal from "../../components/UIComponents/Modal/Modal";
import { ToolBar } from "../../components/ToolBar/ToolBar";

// Functional wrapper — converts class to functional so useNavigate works.
export function BranchesPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [branches] = React.useState([
    { id: 'bid1',  name: 'Branch name 1', location: 'Location 1' },
    { id: 'bid2',  name: 'Branch name 2', location: 'Location 2' },
    { id: 'bid3',  name: 'Branch name 3', location: 'Location 3' },
    { id: 'bid4',  name: 'Branch name 4', location: 'Location 4' },
    { id: 'bid5',  name: 'Branch name 5', location: 'Location 5' },
    { id: 'bid6',  name: 'Branch name 6', location: 'Location 6' },
    { id: 'bid7',  name: 'Branch name 7', location: 'Location 7' },
    { id: 'bid8',  name: 'Branch name 8', location: 'Location 8' },
    { id: 'bid9',  name: 'Branch name 9', location: 'Location 9' },
    { id: 'bid10', name: 'Branch name 10', location: 'Location 10' },
    { id: 'bid11', name: 'Branch name 11', location: 'Location 11' },
    { id: 'bid12', name: 'Branch name 12', location: 'Location 12' },
  ]);

  const onBranchSelect = (branchId) => {
    navigate('/rooms');
  };

  return (
    <>
      {showCreateModal && (
        <Modal
          title="Create Branch"
          onCloseModal={() => setShowCreateModal(false)}
        />
      )}
      <ToolBar
        showDropdown={false}
        createButtonText="Create Branch"
        showViewButton={false}
        onCreate={() => setShowCreateModal(true)}
      />
      <div className="container">
        <BranchesGridView
          branches={branches}
          onBranchSelect={onBranchSelect}
        />
      </div>
    </>
  );
}
