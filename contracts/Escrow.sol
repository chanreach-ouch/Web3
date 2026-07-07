// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Escrow {
    address public admin;
    address payable public seller;
    address public buyer;
    uint public price;
    bool public isFunded;
    bool public isClosed;

    constructor(address payable _seller, address _buyer, uint _price) {
        admin = msg.sender; // The Node.js Backend Server wallet
        seller = _seller;
        buyer = _buyer;
        price = _price;
    }

    // Buyer sends funds to this contract directly via MetaMask
    receive() external payable {
        require(msg.sender == buyer, "Only buyer can fund");
        require(msg.value == price, "Must send exact price");
        require(!isFunded, "Already funded");
        isFunded = true;
    }

    // Backend Admin closes the contract and releases funds to seller automatically
    function releaseFunds() external {
        require(msg.sender == admin, "Only admin can release funds");
        require(isFunded, "Not funded yet");
        require(!isClosed, "Already closed");
        
        isClosed = true;
        (bool success, ) = seller.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
