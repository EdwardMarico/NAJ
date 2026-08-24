document.addEventListener("DOMContentLoaded", () => {
    // ดึงค่า ID จาก attribute ในหน้า HTML นั้นๆ (เช่น data-friend-id="1")
    const profileCard = document.querySelector(".profile-card");
    if (!profileCard) return;
    
    const friendId = profileCard.getAttribute("data-friend-id");

    fetch("web-data/json/info-data.json")
        .then(response => response.json())
        .then(data => {
            const friend = data.friends.find(f => f.id == friendId);
            
            if (friend) {
                document.getElementById("friendAvatar").src = friend.avatar;
                document.getElementById("friendName").textContent = `${friend.firstname} ${friend.lastname}`;
                document.getElementById("friendFirstname").textContent = friend.firstname;
                document.getElementById("friendLastname").textContent = friend.lastname;
                document.getElementById("friendBirthdate").textContent = friend.birthdate;
                document.getElementById("friendPhone").textContent = friend.phone;
                document.getElementById("friendLat").textContent = friend.lat;
                document.getElementById("friendLng").textContent = friend.lng;
                
                const fbLink = document.getElementById("friendFacebook");
                fbLink.href = friend.facebook;
                fbLink.textContent = friend.facebook;

                // ฝังแผนที่ OpenStreetMap
                const mapIframe = document.getElementById("friendMap");
                mapIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${friend.lng-0.01},${friend.lat-0.01},${friend.lng+0.01},${friend.lat+0.01}&layer=mapnik&marker=${friend.lat},${friend.lng}`;
            }
        })
        .catch(error => console.error("Error loading JSON:", error));
});