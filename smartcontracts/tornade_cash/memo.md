Points:
-money laundaring  
-zk-Snark  
-don't track user addresses instead use id calculated by hash(secret, nullifier)
nullifier is used to check if the amount tied with the id has been withdrawn or not  

How to prevent double spending:  
At withdrawal, need to send the following proof  
-hash(s, n) in list bucket...secretn and nullifier  
-hash(n)...
