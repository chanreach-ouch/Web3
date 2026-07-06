// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimplePurchase {
    address public buyer;
    address payable public seller;
    bool public isCompleted;

    constructor(address payable _seller) payable {
        buyer = msg.sender;     
        seller = _seller;       
        isCompleted = false;    
    }

    function confirmDelivery() public {
        require(msg.sender == buyer, "Error: Only the buyer can confirm delivery.");
        require(!isCompleted, "Error: This transaction is already completed.");

        isCompleted = true;
        (bool success, ) = seller.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
