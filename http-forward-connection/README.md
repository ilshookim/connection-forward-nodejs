-----
how to execute:

node modules installation

$ npm install

server listen 8080 and 8081
$ node server.js

http
$ curl localhost:8080

https
$ curl --insecure https://localhost:8081

---
server.js

1 http listen port 8080

2 https listen port 8081

3 [master] master folk workers til cores

5 [worker] app and socket io server listen using http, https

5 [master] when accepted, connection forward to worker process

---
strace node server.js

// parent waiting (server)
[pid 20014] 1533050332.998961 <... epoll_wait resumed> [], 1024, 2999) = 0 <3.002233>

// parent got request, initiate sending the handle. First, send a protocol message (NODE_HANDLE is coming)..
[pid 20014] 1533050333.000182 sendmsg(12, {msg_name(0)=NULL, msg_iov(1)=[{"{\"cmd\":\"NODE_HANDLE\",\"type\":\"net"..., 76}], msg_controllen=24, [{cmsg_len=20, cmsg_level=SOL_SOCKET, cmsg_type=SCM_RIGHTS, [15]}], msg_flags=0}, 0) = 76 <0.000076>

// child receives the message
[pid 20020] 1533050333.000301 <... epoll_wait resumed> [{EPOLLIN, {u32=3, u64=3}}], 1024, -1) = 1 <2.939558>
[pid 20020] 1533050333.000351 recvmsg(3, {msg_name(0)=NULL, msg_iov(1)=[{"{\"cmd\":\"NODE_HANDLE\",\"type\":\"net"..., 65536}], msg_controllen=24, [{cmsg_len=20, cmsg_level=SOL_SOCKET, cmsg_type=SCM_RIGHTS, [13]}], msg_flags=MSG_CMSG_CLOEXEC}, MSG_CMSG_CLOEXEC) = 76 <0.000020>

// child parses the handle
[pid 20020] 1533050333.000425 getsockname(13, {sa_family=AF_INET6, sin6_port=htons(12000), inet_pton(AF_INET6, "::ffff:127.0.0.1", &sin6_addr), sin6_flowinfo=0, sin6_scope_id=0}, [28]) = 0 <0.000040>
[pid 20020] 1533050333.000497 getsockopt(13, SOL_SOCKET, SO_TYPE, [1], [4]) = 0 <0.000042>

//parent waits.
[pid 20014] 1533050333.000595 epoll_ctl(3, EPOLL_CTL_MOD, 12, {EPOLLIN, {u32=12, u64=12}}) = 0 <0.000022>
[pid 20014] 1533050333.000652 epoll_wait(3, [], 1024, 0) = 0 <0.000012>
[pid 20014] 1533050333.000693 epoll_wait(3,  <unfinished ...>

// child writes an acknowledgement - handle received, thank you!
[pid 20020] 1533050333.002349 write(3, "{\"cmd\":\"NODE_HANDLE_ACK\"}\n", 26) = 26 <0.000050>

// parent received it.
[pid 20014] 1533050333.002419 <... epoll_wait resumed> [{EPOLLIN, {u32=12, u64=12}}], 1024, 116992) = 1 <0.001720>
[pid 20014] 1533050333.002446 recvmsg(12, {msg_name(0)=NULL, msg_iov(1)=[{"{\"cmd\":\"NODE_HANDLE_ACK\"}\n", 65536}], msg_controllen=0, msg_flags=MSG_CMSG_CLOEXEC}, MSG_CMSG_CLOEXEC) = 26 <0.000015>

//child code runs
[pid 20020] 1533050333.005049 write(11, "got it\n", 7got it = 7 <0.000018>
