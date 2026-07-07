// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ECommerceMarketplace {
    uint public productCount = 0;
    
    struct Product {
        uint id;
        string name;
        string imageHash;
        uint price;
        address payable seller;
        address buyer;
        bool isPurchased;
        bool isDelivered;
    }
    
    mapping(uint => Product) public products;
    
    event ProductListed(uint id, string name, uint price, address seller);
    event ProductPurchased(uint id, address buyer);
    event ProductDelivered(uint id, address seller);
    
    function listProduct(string memory _name, string memory _imageHash, uint _price) public {
        require(bytes(_name).length > 0, "Product name is required");
        require(_price > 0, "Product price must be greater than zero");
        
        productCount++;
        products[productCount] = Product(
            productCount,
            _name,
            _imageHash,
            _price,
            payable(msg.sender),
            address(0),
            false,
            false
        );
        
        emit ProductListed(productCount, _name, _price, msg.sender);
    }
    
    function buyProduct(uint _id) public payable {
        Product memory _product = products[_id];
        
        require(_product.id > 0 && _product.id <= productCount, "Product does not exist");
        require(!_product.isPurchased, "Product already purchased");
        require(msg.sender != _product.seller, "Seller cannot buy their own product");
        require(msg.value == _product.price, "Please submit the exact price");
        
        _product.buyer = msg.sender;
        _product.isPurchased = true;
        
        products[_id] = _product;
        
        emit ProductPurchased(_id, msg.sender);
    }
    
    function confirmDelivery(uint _id) public {
        Product memory _product = products[_id];
        
        require(_product.isPurchased, "Product has not been purchased");
        require(!_product.isDelivered, "Product already delivered");
        require(msg.sender == _product.buyer, "Only buyer can confirm delivery");
        
        _product.isDelivered = true;
        products[_id] = _product;
        
        (bool success, ) = _product.seller.call{value: _product.price}("");
        require(success, "Transfer to seller failed");
        
        emit ProductDelivered(_id, _product.seller);
    }
}
