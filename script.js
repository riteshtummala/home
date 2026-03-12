// ===============================
// SUPABASE CONFIG (PRODUCTION)
// ===============================

const SUPABASE_URL = "https://pqtyjdknlopuiipynyag.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHlqZGtubG9wdWlpcHlueWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTE0MzgsImV4cCI6MjA4ODg2NzQzOH0.cH9JFo_sGljYt6lB2yk1GbMbyJo5rlhqRk5dfF_6DdQ";

// Safe init for live environments
var supabase = window.supabase ? window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
) : null;

// Global State
let currentUser = null;
let currentUserRole = 'student';


// ===============================
// AUTH & RBAC CHECK
// ===============================

async function checkAuth(requireAdmin = false) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if(!user){
    window.location.href = "login.html";
    return null;
  }
  
  currentUser = user;

  // Fetch role from public.users
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if(userData) {
    currentUserRole = userData.role;
  }

  // RBAC Enforcement on Client Side
  if(requireAdmin && currentUserRole === 'student') {
    alert("Access Denied. You do not have permission to view this page.");
    window.location.href = "dashboard.html";
    return null;
  }

  // Enhance UI based on role
  applyRoleUI();

  return user;
}

function applyRoleUI() {
    // Show 'Create Event' link in Sidebar only to Admins/Organizers
    const createEventLink = document.getElementById("nav-create-event");
    const headerCreateEvent = document.getElementById("header-create-event");
    const navAdmin = document.getElementById("nav-admin");
    const navVolunteer = document.getElementById("nav-volunteer");
    const navAnalytics = document.getElementById("nav-analytics");
    
    if(currentUserRole === 'admin' || currentUserRole === 'organizer') {
        if(createEventLink) createEventLink.style.display = 'flex';
        if(headerCreateEvent) headerCreateEvent.style.display = 'flex';
        if(navAdmin && currentUserRole === 'admin') {
            navAdmin.style.display = 'flex';
            if(navAnalytics) navAnalytics.style.display = 'flex';
        }
    } else {
        if(createEventLink) createEventLink.style.display = 'none';
        if(headerCreateEvent) headerCreateEvent.style.display = 'none';
        if(navAdmin) navAdmin.style.display = 'none';
        if(navAnalytics) navAnalytics.style.display = 'none';
    }

    if(currentUserRole === 'admin' || currentUserRole === 'volunteer') {
        if(navVolunteer) navVolunteer.style.display = 'flex';
    } else {
        if(navVolunteer) navVolunteer.style.display = 'none';
    }

    // Show 'Scan Tickets' link in Sidebar only to Admins/Volunteers
    const scanTicketLink = document.getElementById("nav-scan-ticket");
    if(scanTicketLink) {
        if(currentUserRole === 'admin' || currentUserRole === 'volunteer') {
            scanTicketLink.style.display = 'flex';
        } else {
            scanTicketLink.style.display = 'none';
        }
    }
}


// ===============================
// AUTHENTICATION FLOWS
// ===============================

async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/dashboard.html'
        }
    });
    if(error) alert(error.message);
}

async function registerUser(){
  const fullName = document.getElementById("fullname").value;
  const regNumber = document.getElementById("regnumber").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const affiliation = document.getElementById("affiliation").value;

  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options:{
      data:{
        full_name: fullName,
        reg_number: regNumber,
        affiliation: affiliation // Stored in raw_user_meta_data
      }
    }
  });

  if(error){
    alert(error.message);
  } else {
    alert("Registration successful! Proceed to Login.");
    window.location.href = "login.html";
  }
}

async function loginUser(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if(error){
    alert(error.message);
  } else {
    window.location.href = "dashboard.html";
  }
}

async function logout(){
  await supabase.auth.signOut();
  window.location.href = "index.html";
}


// ===============================
// PROFILE MANAGEMENT
// ===============================

async function loadProfileData() {
    if(!currentUser) return;
    if(!document.getElementById('prof-email')) return;

    const meta = currentUser.user_metadata || {};
    
    // Fallbacks for generic OAuth (like Google)
    const fullName = meta.full_name || meta.name || '';
    const nameParts = fullName.split(' ');
    const initials = nameParts.length > 1 
        ? nameParts[0][0] + nameParts[nameParts.length - 1][0] 
        : (fullName[0] || '?');

    // Paint UI
    document.getElementById('profile-avatar-initials').innerText = initials.toUpperCase();
    document.getElementById('profile-display-name').innerText = fullName || currentUser.email;
    document.getElementById('profile-role-badge').innerText = currentUserRole.toUpperCase() + " ACCOUNT";
    
    // Paint Inputs
    document.getElementById('prof-email').value = currentUser.email;
    document.getElementById('prof-fullname').value = fullName;
    document.getElementById('prof-regnumber').value = meta.reg_number || '';
    document.getElementById('prof-affiliation').value = meta.affiliation || '';
}

async function updateProfile() {
    const fullName = document.getElementById('prof-fullname').value;
    const regNumber = document.getElementById('prof-regnumber').value;
    const affiliation = document.getElementById('prof-affiliation').value;
    const btn = document.getElementById('save-prof-btn');

    btn.innerText = "Saving...";
    btn.disabled = true;

    const { data, error } = await supabase.auth.updateUser({
        data: {
            full_name: fullName,
            reg_number: regNumber,
            affiliation: affiliation
        }
    });

    btn.innerText = "Save Changes";
    btn.disabled = false;

    if(error){
        alert("Failed to update profile: " + error.message);
    } else {
        currentUser = data.user;
        loadProfileData(); // Repaint UI
        alert("Profile updated successfully!");
    }
}


// ===============================
// DASHBOARD STATS
// ===============================

async function loadDashboardStats(tabId = 'nav-overview') {
    // Only run on dashboard
    if(!document.getElementById('stat-events')) return;

    const labelEvents = document.getElementById('stat-label-events');
    const labelRegs = document.getElementById('stat-label-registrations');
    const labelTickets = document.getElementById('stat-label-tickets');

    document.getElementById('stat-events').innerText = "...";
    document.getElementById('stat-registrations').innerText = "...";
    document.getElementById('stat-tickets').innerText = "...";

    if (tabId === 'nav-admin' && currentUserRole === 'admin') {
        if(labelEvents) labelEvents.innerText = "Created Events";
        if(labelRegs) labelRegs.innerText = "Event Registrations";
        if(labelTickets) labelTickets.innerText = "Volunteers Assigned";
        
        let createdEventsCount = 0;
        let adminRegsCount = 0;
        let adminVolsCount = 0;

        if (currentUser) {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    id,
                    registrations(count),
                    event_volunteers(count)
                `)
                .eq('created_by', currentUser.id);

            if (!error && data) {
                createdEventsCount = data.length;
                adminRegsCount = data.reduce((acc, ev) => acc + (ev.registrations[0]?.count || 0), 0);
                adminVolsCount = data.reduce((acc, ev) => acc + (ev.event_volunteers[0]?.count || 0), 0);
            }
        }

        document.getElementById('stat-events').innerText = createdEventsCount;
        document.getElementById('stat-registrations').innerText = adminRegsCount;
        document.getElementById('stat-tickets').innerText = adminVolsCount;

    } else {
        // Standard View
        if(labelEvents) labelEvents.innerText = "Active Events";
        if(labelRegs) labelRegs.innerText = "Total Registrations";
        if(labelTickets) labelTickets.innerText = "Your Tickets";

        // 1. Total Active Events
        const { count: eventsCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('is_published', true);
        
        // 2. Total Registrations Globally
        const { count: regsCount } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true });

        // 3. Current User Tickets
        let myTicketsCount = 0;
        if(currentUser) {
            const { count } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', currentUser.id);
            myTicketsCount = count || 0;
        }

        document.getElementById('stat-events').innerText = eventsCount || 0;
        document.getElementById('stat-registrations').innerText = regsCount || 0;
        document.getElementById('stat-tickets').innerText = myTicketsCount;
    }
}

// ===============================
// EVENT MANAGEMENT (LOAD/CREATE/DELETE)
// ===============================

async function loadEvents(filter = 'all'){
  const container = document.getElementById("events-container");
  if(!container) return;

  container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 3rem 0; grid-column: 1/-1;">
          <div class="spinner" style="margin: 0 auto 1rem;"></div>
          Loading feed...
      </div>
  `;

  let eventsData = [];

  if (filter === 'my_tickets') {
    if(!currentUser) return;
    const { data: regData, error } = await supabase
        .from('registrations')
        .select(`ticket_id, events(*)`)
        .eq('user_id', currentUser.id);

    if (error) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Error loading tickets.</p>`;
        return;
    }
    // Embed the ticket_id into the event payload for the frontend renderer
    eventsData = regData.map(r => {
        if(r.events) {
            r.events.personal_ticket_id = r.ticket_id;
            return r.events;
        }
        return null;
    }).filter(e => e !== null);

  } else if (filter === 'my_assigned_events') {
    if(!currentUser) return;
    const { data: vData, error } = await supabase
        .from("event_volunteers")
        .select(`events(*)`)
        .eq("user_id", currentUser.id);

    if(error){
        console.error("Error loading assigned events", error);
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Error loading feed.</p>`;
        return;
    }
    eventsData = vData.map(v => v.events).filter(e => e !== null);
  } else if (filter === 'my_created_events') {
    if(!currentUser) return;
    const { data, error } = await supabase
        .from("events")
        .select(`
            *,
            registrations(count),
            event_volunteers(count)
        `)
        .eq("created_by", currentUser.id)
        .order("event_date",{ ascending:true });

    if(error){
        console.error("Error loading admin events", error);
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Error loading feed.</p>`;
        return;
    }
    eventsData = data;
  } else {
    // 'all' or 'discover'
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("event_date",{ ascending:true });

    if(error){
        console.error("Error loading events", error);
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Error loading feed.</p>`;
        return;
    }
    eventsData = data;
  }

  container.innerHTML = "";
  if(eventsData.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No events found.</p>`;
      return;
  }

  eventsData.forEach(event => {
    // Check if the user is an admin or the creator of the event
    const canDelete = currentUserRole === 'admin' || (currentUser && currentUser.id === event.created_by);
    
    // Build the delete badge if authorized
    const deleteButtonHTML = canDelete ? 
        `<button class="badge-admin" onclick="deleteEvent('${event.id}', event)" title="Delete Event">
            <i class="fa-solid fa-trash"></i>
        </button>` : '';

    const volunteerButtonHTML = (filter === 'my_created_events' || currentUserRole === 'admin') ? 
        `<button class="btn btn-outline" onclick="promoteVolunteer('${event.id}')" style="width: 100%; margin-bottom: 0.5rem;">
            <i class="fa-solid fa-user-plus"></i> Assign Volunteer
        </button>` : '';

    // If we're an admin viewing creations, show the extra stats block securely fetched via SQL relation counts
    let adminStatsHTML = '';
    if (filter === 'my_created_events') {
        const regCount = (event.registrations && event.registrations[0]) ? event.registrations[0].count : 0;
        const volCount = (event.event_volunteers && event.event_volunteers[0]) ? event.event_volunteers[0].count : 0;
        adminStatsHTML = `
            <div style="display: flex; gap: 1rem; background: var(--bg-primary); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--border-color);">
                <div style="flex: 1; text-align: center;">
                    <span style="display: block; font-size: 1.25rem; font-weight: 700; color: var(--brand);">${regCount}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Registrations</span>
                </div>
                <div style="width: 1px; background: var(--border-color);"></div>
                <div style="flex: 1; text-align: center;">
                    <span style="display: block; font-size: 1.25rem; font-weight: 700; color: #10b981;">${volCount}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Volunteers</span>
                </div>
            </div>
        `;
    }

    let qrHtmlBlock = '';
    // If the user's looking at their own tickets, inject a target div for qrcode.js
    if (filter === 'my_tickets' && event.personal_ticket_id) {
        qrHtmlBlock = `
            <div style="text-align: center; margin: 1rem 0;">
                <div id="qr-${event.personal_ticket_id}" style="background:#fff; padding:0.5rem; display:inline-block; border-radius:8px;"></div>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem; letter-spacing: 0.05em; text-transform:uppercase;">${event.personal_ticket_id}</p>
            </div>
        `;
    }

    container.innerHTML += `
    <div class="event-card animate-slide-up">
      ${deleteButtonHTML}
      <img src="${event.banner_url || 'https://via.placeholder.com/400'}" alt="Event Banner">
      <div class="event-card-content">
        <h3>${event.title}</h3>
        <p><i class="fa-solid fa-location-dot"></i> ${event.location}</p>
        <p><i class="fa-solid fa-calendar"></i> ${event.event_date || 'TBD'}</p>
        ${qrHtmlBlock}
        <div style="margin-top: auto; padding-top: 1rem;">
           ${adminStatsHTML}
           ${volunteerButtonHTML}
           <a href="event-details.html?id=${event.id}" class="btn btn-primary" style="width: 100%;">View Details</a>
        </div>
      </div>
    </div>
    `;
  });

  // Post HTML generation Hook -> Tell QRCode.js to populate the UI targets we just dropped
  if (filter === 'my_tickets') {
      setTimeout(() => {
          eventsData.forEach(event => {
              const domId = `qr-${event.personal_ticket_id}`;
              const qrContainer = document.getElementById(domId);
              if(qrContainer) {
                  new QRCode(qrContainer, {
                      text: event.personal_ticket_id,
                      width: 120,
                      height: 120,
                      colorDark : "#0f172a",
                      colorLight : "#ffffff",
                      correctLevel : QRCode.CorrectLevel.L
                  });
              }
          });
      }, 50); // slight debounce letting innerHTML reflow complete
  }
}

function switchTab(tabId) {
    // Update active UI classes
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    const titleEl = document.getElementById('dashboard-title');
    const subtitleEl = document.getElementById('dashboard-subtitle');
    
    // Core Layout Containers
    const eventsContainer = document.getElementById('events-container');
    const feedHeader = document.querySelector('.section-header');
    
    // Directory & Unique Tool Containers hidden by default
    const adminDirectory = document.getElementById('admin-directory-section');
    const volunteerDirectory = document.getElementById('volunteer-directory-section');
    const analyticsSection = document.getElementById('analytics-section');
    const settingsSection = document.getElementById('settings-section');
    
    if (eventsContainer) eventsContainer.style.display = 'grid';
    if (feedHeader) feedHeader.style.display = 'flex';
    if (adminDirectory) adminDirectory.style.display = 'none';
    if (volunteerDirectory) volunteerDirectory.style.display = 'none';
    if (analyticsSection) analyticsSection.style.display = 'none';
    if (settingsSection) settingsSection.style.display = 'none';

    if(tabId === 'nav-overview' || tabId === 'nav-discover') {
        if(titleEl) titleEl.innerText = tabId === 'nav-discover' ? "Discover Events" : "Dashboard Overview";
        if(subtitleEl) subtitleEl.innerText = "Here is what's happening on campus.";
        loadEvents('all'); // Overview handles all events in this MVP iteration
    } else if (tabId === 'nav-tickets') {
        if(titleEl) titleEl.innerText = "My Tickets";
        if(subtitleEl) subtitleEl.innerText = "Events you are officially registered for.";
        loadEvents('my_tickets');
    } else if (tabId === 'nav-admin') {
        if(titleEl) titleEl.innerText = "Admin Panel";
        if(subtitleEl) subtitleEl.innerText = "Manage events you created and assign volunteers.";
        loadEvents('my_created_events');
        
        // Spawn Admin Directory
        if (adminDirectory) {
            adminDirectory.style.display = 'block';
            loadUserDirectory(['admin'], 'admin-directory-list');
        }
    } else if (tabId === 'nav-volunteer') {
        if(titleEl) titleEl.innerText = "Volunteer Dashboard";
        if(subtitleEl) subtitleEl.innerText = "Events you are staffed to. Your Scanner is valid ONLY on the day of the event.";
        loadEvents('my_assigned_events');
        
        // Spawn Volunteer/Student Directory
        if (volunteerDirectory) {
            volunteerDirectory.style.display = 'block';
            loadUserDirectory(['volunteer', 'student'], 'volunteer-directory-list');
        }
    } else if (tabId === 'nav-analytics') {
        if(titleEl) titleEl.innerText = "Performance Analytics";
        if(subtitleEl) subtitleEl.innerText = "Deep dive into event conversions and volunteer scanning metrics.";
        if (eventsContainer) eventsContainer.style.display = 'none';
        if (feedHeader) feedHeader.style.display = 'none';
        if (analyticsSection) {
            analyticsSection.style.display = 'block';
            loadAnalytics();
        }
    } else if (tabId === 'nav-settings') {
        if(titleEl) titleEl.innerText = "Profile Settings";
        if(subtitleEl) subtitleEl.innerText = "Manage your active account metadata and affiliations.";
        if (eventsContainer) eventsContainer.style.display = 'none';
        if (feedHeader) feedHeader.style.display = 'none';
        if (settingsSection) {
            settingsSection.style.display = 'block';
            loadSettings();
        }
    }
    
    // Refresh Stats Block explicitly for this view context
    loadDashboardStats(tabId);
}

// ===============================
// SETTINGS & ANALYTICS
// ===============================

async function loadSettings() {
    const container = document.getElementById('settings-section');
    if(!container) return;

    if(!currentUser) {
        container.innerHTML = `<p>Error: Please sign in.</p>`;
        return;
    }

    const meta = currentUser.user_metadata || {};
    
    container.innerHTML = `
        <div style="background: var(--bg-secondary); padding: 2.5rem; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); margin-bottom: 2rem;">
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">Account Preferences</h3>
                <p style="color: var(--text-secondary);">Update your public student or faculty profile attributes here.</p>
            </div>
            
            <form onsubmit="handleSettingsUpdate(event)">
                <div class="input-group">
                    <label>Full Name</label>
                    <input type="text" id="settings-name" class="input" value="${meta.full_name || ''}" placeholder="e.g. Jane Doe" required>
                </div>
                <div class="input-group">
                    <label>Affiliation / ID</label>
                    <input type="text" id="settings-affiliation" class="input" value="${meta.affiliation || ''}" placeholder="e.g. Computer Science '26">
                </div>
                
                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0;">
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Account Email</p>
                        <p style="font-family: monospace; padding: 4px 8px; background: var(--bg-tertiary); border-radius: 6px;">${currentUser.email}</p>
                    </div>
                    <button type="submit" class="btn btn-primary" id="settings-save-btn">Save Profile Metadata</button>
                </div>
            </form>
        </div>

        <div style="background: var(--bg-secondary); padding: 2.5rem; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: var(--shadow-md);">
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--text-primary);">App Experience & Privacy</h3>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
                <div>
                    <h4 style="margin: 0 0 0.25rem 0; color: var(--text-primary);">Theme Preference</h4>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Force dark or light mode independent of OS.</p>
                </div>
                <div style="display: flex; gap: 0.5rem; background: var(--bg-tertiary); padding: 0.25rem; border-radius: 8px;">
                    <button onclick="setConcreteTheme('light')" class="btn" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; background: ${localStorage.getItem('theme') === 'light' ? 'var(--bg-primary)' : 'transparent'}; color: ${localStorage.getItem('theme') === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)'}; box-shadow: ${localStorage.getItem('theme') === 'light' ? 'var(--shadow-sm)' : 'none'};"><i class="fa-solid fa-sun" style="margin-right: 0.5rem;"></i> Light</button>
                    <button onclick="setConcreteTheme('dark')" class="btn" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; background: ${localStorage.getItem('theme') === 'dark' ? 'var(--bg-primary)' : 'transparent'}; color: ${localStorage.getItem('theme') === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)'}; box-shadow: ${localStorage.getItem('theme') === 'dark' ? 'var(--shadow-sm)' : 'none'};"><i class="fa-solid fa-moon" style="margin-right: 0.5rem;"></i> Dark</button>
                </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1.5rem;">
                <div>
                    <h4 style="margin: 0 0 0.25rem 0; color: var(--text-primary);">Public Profile Discovery</h4>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Allow organizers to invite you to exclusive events.</p>
                </div>
                <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
                    <input type="checkbox" style="opacity: 0; width: 0; height: 0;" checked>
                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--brand); transition: .4s; border-radius: 24px;">
                        <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; transform: translateX(20px);"></span>
                    </span>
                </label>
            </div>
        </div>
    `;
}

function setConcreteTheme(mode) {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
    
    // Fix the sidebar toggle icon if it exists
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) icon.className = mode === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
    
    // Rerender settings panel to update the bold button selection
    loadSettings();
}

async function handleSettingsUpdate(e) {
    e.preventDefault();
    const btn = document.getElementById('settings-save-btn');
    btn.innerText = 'Saving...';
    btn.disabled = true;

    const name = document.getElementById('settings-name').value;
    const affiliation = document.getElementById('settings-affiliation').value;

    const { data, error } = await supabase.auth.updateUser({
        data: { full_name: name, affiliation: affiliation }
    });

    if (error) {
        alert("Settings update failed: " + error.message);
        btn.innerText = 'Save Profile Metadata';
        btn.disabled = false;
    } else {
        alert("Profile successfully updated!");
        currentUser = data.user; // Update local cache
        btn.innerText = 'Saved!';
        setTimeout(() => {
            btn.innerText = 'Save Profile Metadata';
            btn.disabled = false;
        }, 3000);
    }
}

async function loadAnalytics() {
    const container = document.getElementById('analytics-section');
    if(!container) return;
    container.innerHTML = `<div class="spinner" style="margin: 0 auto;"></div>`;

    if (currentUserRole !== 'admin') {
        container.innerHTML = `<p style="text-align:center; color: var(--error);">Unauthorized Analytics Access.</p>`;
        return;
    }

    try {
        // 1. Fetch Event Performance Metrics
        const { data: eventData, error: evErr } = await supabase
            .from('events')
            .select('title, capacity, registrations(count), check_ins:registrations(check_ins)')
            .eq('created_by', currentUser.id);

        if (evErr) throw evErr;

        let totalCap = 0;
        let totalReg = 0;
        let totalCheckins = 0;

        eventData.forEach(ev => {
            totalCap += (ev.capacity || 0);
            totalReg += (ev.registrations && ev.registrations[0] ? ev.registrations[0].count : 0);
            if (ev.check_ins) {
                // check_ins relation comes back as array of objects { check_ins: number }
                ev.check_ins.forEach(ci => {
                   totalCheckins += (ci.check_ins || 0); 
                });
            }
        });

        const fillRate = totalCap > 0 ? Math.round((totalReg / totalCap) * 100) : 0;
        const conversionRate = totalReg > 0 ? Math.round((totalCheckins / totalReg) * 100) : 0;

        // 2. Fetch Volunteer Performance (Audit Logs)
        const { data: scanData, error: scanErr } = await supabase
            .from('ticket_scans')
            .select(`
                scanned_by,
                users ( raw_user_meta_data, email )
            `);
        
        if (scanErr) throw scanErr;

        const volStats = {};
        scanData.forEach(scan => {
            const volId = scan.scanned_by;
            if (!volStats[volId]) {
                const meta = scan.users?.raw_user_meta_data || {};
                volStats[volId] = {
                    name: meta.full_name || 'Anonymous Staff',
                    email: scan.users?.email || 'Unknown Email',
                    count: 0
                };
            }
            volStats[volId].count++;
        });

        // Sort leaderboard highest first
        const leaderboard = Object.values(volStats).sort((a,b) => b.count - a.count);

        let leaderboardHtml = leaderboard.length > 0 
            ? leaderboard.map((vol, index) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--border-color); ${index === 0 ? 'background: rgba(245, 158, 11, 0.05); border-radius: 8px;' : ''}">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-weight: 700; color: ${index === 0 ? 'var(--brand)' : 'var(--text-secondary)'};">
                            ${index + 1}
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: 600; color: var(--text-primary);">${vol.name}</p>
                            <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">${vol.email}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${vol.count}</span>
                        <p style="margin: 0; font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase;">Scans</p>
                    </div>
                </div>
            `).join('')
            : `<p style="padding: 2rem; text-align: center; color: var(--text-secondary);">No scans recorded yet.</p>`;

        // Render UI
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <!-- Event Stats -->
                <div class="stat-card" style="margin-bottom: 0;">
                    <div class="stat-info">
                        <h3 style="font-size: 2rem; color: var(--brand); margin-bottom: 0.25rem;">${fillRate}%</h3>
                        <p style="color: var(--text-secondary); font-size: 0.85rem;">Global Capacity Fill Rate</p>
                    </div>
                    <div class="stat-icon" style="background: var(--brand-light); color: var(--brand);"><i class="fa-solid fa-users"></i></div>
                </div>
                
                <div class="stat-card" style="margin-bottom: 0;">
                    <div class="stat-info">
                        <h3 style="font-size: 2rem; color: #10b981; margin-bottom: 0.25rem;">${conversionRate}%</h3>
                        <p style="color: var(--text-secondary); font-size: 0.85rem;">Check-in Conversion</p>
                    </div>
                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;"><i class="fa-solid fa-qrcode"></i></div>
                </div>
                
                <div class="stat-card" style="margin-bottom: 0;">
                    <div class="stat-info">
                        <h3 style="font-size: 2rem; color: #8b5cf6; margin-bottom: 0.25rem;">${totalCheckins}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.85rem;">Total Valid Scans</p>
                    </div>
                    <div class="stat-icon" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6;"><i class="fa-solid fa-ticket"></i></div>
                </div>
            </div>

            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm);">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">
                    <h3 style="font-size: 1.25rem; margin: 0; color: var(--text-primary);">Volunteer Performance Leaderboard</h3>
                </div>
                <div>
                    ${leaderboardHtml}
                </div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="text-align: center; color: var(--error);">Error loading analytics.</p>`;
    }
}

// ===============================
// DIRECTORIES
// ===============================

async function loadUserDirectory(rolesArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div class="spinner" style="margin: 0 auto;"></div>`;

    const { data, error } = await supabase.rpc('get_users_by_role', {
        target_roles: rolesArray
    });

    if (error || !data) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Error loading directory. ${error ? error.message : ''}</p>`;
        return;
    }

    if (data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No users found.</p>`;
        return;
    }

    container.innerHTML = '';
    data.forEach(user => {
        const meta = user.raw_user_meta_data || {};
        const name = meta.full_name || 'Anonymous User';
        const affiliation = meta.affiliation || 'Unspecified Affiliation';
        
        let badgeColor = 'var(--text-secondary)';
        let badgeBg = 'var(--bg-tertiary)';
        let icon = 'fa-user';

        if (user.role === 'admin') {
            badgeColor = 'var(--brand)';
            badgeBg = 'var(--brand-light)';
            icon = 'fa-user-tie';
        } else if (user.role === 'volunteer') {
            badgeColor = '#10b981';
            badgeBg = 'rgba(16, 185, 129, 0.1)';
            icon = 'fa-clipboard-user';
        }

        container.innerHTML += `
            <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; display: flex; align-items: flex-start; gap: 1rem; box-shadow: var(--shadow-sm);">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: ${badgeBg}; color: ${badgeColor}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <h4 style="margin: 0 0 0.25rem 0; font-size: 1.1rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</h4>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: var(--text-secondary);">${user.email}</p>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600; text-transform: uppercase;">
                            ${user.role}
                        </span>
                        ${affiliation ? `<span style="font-size: 0.75rem; color: var(--text-tertiary);"><i class="fa-solid fa-building"></i> ${affiliation}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
}

async function promoteVolunteer(eventId) {
    const email = prompt("Enter the email address of the user you want to assign as a Volunteer for this event:");
    if(!email) return;

    // Call our custom RPC function (now requiring eventId payload for tracking)
    const { data, error } = await supabase.rpc('promote_to_volunteer', {
        target_email: email.trim(),
        target_event_id: eventId
    });

    if (error) {
        alert("Failed to assign volunteer: " + error.message);
    } else {
        alert("Successfully tracked " + email + " as an Assigned Volunteer! They have been elevated globally to scan tickets.");
        loadEvents('my_created_events'); // Refresh stats dynamically
    }
}

async function promoteAdmin() {
    const email = prompt("Enter the email address of the user you want to elevate to a Platform Administrator:");
    if(!email) return;

    // Call our custom RPC function defined in advanced_roles.sql
    const { data, error } = await supabase.rpc('promote_to_admin', {
        target_email: email.trim()
    });

    if (error) {
        alert("Failed to promote user to Admin: " + error.message);
    } else {
        alert("Successfully elevated " + email + " to an Administrator!");
        loadUserDirectory(['admin'], 'admin-directory-list'); // Refresh the directory
    }
}

async function createEvent(){
  const user = await checkAuth(true); // requires admin/organizer
  if(!user) return;

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const location = document.getElementById("location").value;
  const date = document.getElementById("date").value;
  const capacity = document.getElementById("capacity").value;
  const ticketType = document.getElementById("ticket_type") ? document.getElementById("ticket_type").value : 'single';
  const category = document.getElementById("category") ? document.getElementById("category").value : 'General';
  const isFeatured = document.getElementById("is_featured") ? document.getElementById("is_featured").checked : false;
  
  // Quick file upload check
  let bannerUrl = null;
  const fileInput = document.getElementById('banner-upload');
  if(fileInput && fileInput.files.length > 0) {
      bannerUrl = await uploadBanner(fileInput.files[0]);
  }

  const { error } = await supabase
  .from("events")
  .insert({
    title: title,
    description: description,
    location: location,
    event_date: date,
    capacity: capacity || 100,
    ticket_type: ticketType,
    category: category,
    is_featured: isFeatured,
    banner_url: bannerUrl,
    created_by: user.id
  });

  if(error){
    alert("Error creating event: " + error.message);
  } else {
    alert("Event Published!");
    window.location.href = "dashboard.html";
  }
}

async function deleteEvent(eventId, ev) {
    if(ev) ev.preventDefault(); // Stop click from propagating if inside an anchor bubble

    if(!confirm("Are you sure you want to completely delete this event? This action cannot be undone.")) {
        return;
    }

    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

    if (error) {
        alert("Delete failed: " + error.message);
    } else {
        alert("Event successfully deleted.");
        loadEvents(); // Refresh DOM immediately
        loadDashboardStats(); // Refresh stats
    }
}


// ===============================
// EVENT DETAILS & REGISTRATION
// ===============================

async function loadEventDetails(){
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  if(!eventId) return;

  const { data, error } = await supabase
  .from("events")
  .select("*")
  .eq("id", eventId)
  .single();

  if(error){
    console.error(error);
    return;
  }

  if(document.getElementById("event-title")) document.getElementById("event-title").innerText = data.title;
  if(document.getElementById("event-description")) document.getElementById("event-description").innerText = data.description;
  if(document.getElementById("event-location")) document.getElementById("event-location").innerText = data.location;
  if(document.getElementById("event-date")) document.getElementById("event-date").innerText = data.event_date;

  if(document.getElementById("event-capacity")) {
    document.getElementById("event-capacity").innerText = `${data.registration_count} / ${data.capacity}`;
  }

  // If there's an image banner, swap it
  const heroBanner = document.querySelector('.hero-banner');
  if(heroBanner && data.banner_url) {
      heroBanner.style.background = `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url('${data.banner_url}') center/cover no-repeat`;
  }
}

async function registerEvent(){
  const user = await checkAuth();
  if(!user) return;

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  // 1. Insert the registration
  const { data, error } = await supabase
  .from("registrations")
  .insert({
    event_id: eventId,
    user_id: user.id
  })
  .select() // Return the inserted row so we can get the automatic ticket_id
  .single();

  if(error){
    alert(error.message);
  } else {
    // 2. We successfully generated a ticket! Show it in the modal.
    const ticketIdElement = document.getElementById('generated-ticket-id');
    if(ticketIdElement && data.ticket_id) {
        ticketIdElement.innerText = "Ticket ID: " + data.ticket_id;
    }

    // 3. Render a dynamic QR Code for scanners to fetch later
    const qrContainer = document.getElementById("qrcode");
    if(qrContainer && data.ticket_id) {
        qrContainer.innerHTML = ""; // Clear existing
        new QRCode(qrContainer, {
            text: data.ticket_id,
            width: 160,
            height: 160,
            colorDark : "#0f172a",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    if(typeof showModal === 'function') {
        showModal();
    } else {
        alert("Registration successful! Your Ticket ID is: " + data.ticket_id);
    }
  }
}
// ===============================
// TICKET SCANNING (VOLUNTEER/ADMIN)
// ===============================

async function processTicketScan() {
    const ticketId = document.getElementById('ticket-input').value.trim();
    if(!ticketId) return;

    const resultCard = document.getElementById('scan-result-card');
    const resultIcon = document.getElementById('scan-icon');
    const resultTitle = document.getElementById('scan-title');
    const resultMeta = document.getElementById('scan-meta');
    const scanType = document.getElementById('scan-type');
    const scanCount = document.getElementById('scan-count');

    resultCard.style.display = 'block';
    resultCard.className = 'scan-result'; // reset
    resultTitle.innerText = "Verifying...";
    resultMeta.innerText = "Please wait.";
    scanType.innerText = "-";
    scanCount.innerText = "-";

    try {
        // Query the ticket and join the event and user data
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                id, ticket_id, check_ins,
                events ( title, ticket_type ),
                users ( raw_user_meta_data )
            `)
            .eq('ticket_id', ticketId)
            .single();

        if (error || !data) {
            throw new Error("Invalid or unassigned ticket ID.");
        }

        const ev = data.events;
        const meta = data.users.raw_user_meta_data || {};
        const userName = meta.full_name || "Unknown Attendee";

        // Time Restricted Security Logic!
        // If the checking-in user is a volunteer, their scanner is ONLY valid on the current Date.
        if (currentUserRole === 'volunteer') {
             // 1. Are they assigned to this specific event?
             const { data: mappingData, error: mapErr } = await supabase
                .from('event_volunteers')
                .select('*')
                .eq('event_id', ev.id)
                .eq('user_id', currentUser.id)
                .single();

             if(mapErr || !mappingData) {
                 resultCard.classList.add('error');
                 resultIcon.innerHTML = `<i class="fa-solid fa-ban"></i>`;
                 resultTitle.innerText = "Scanner Denied";
                 resultMeta.innerText = `You are not staffed as a Volunteer for this Event.`;
                 return;
             }
             
             // 2. Is today the date of the event? (Stops volunteers from trying to use a scanner post-event closure)
             if (ev.event_date) {
                 const evDate = new Date(ev.event_date).toDateString();
                 const todayDate = new Date().toDateString();
                 
                 if (evDate !== todayDate) {
                     resultCard.classList.add('error');
                     resultIcon.innerHTML = `<i class="fa-solid fa-clock"></i>`;
                     resultTitle.innerText = "Event Expired";
                     resultMeta.innerText = `Your Scanner Authorization is revoked outside event hours. Event Date: ${evDate}`;
                     return;
                 }
             }
        }

        // Logic Check: Single vs Multiple
        if (ev.ticket_type === 'single' && data.check_ins >= 1) {
            // DENY
            resultCard.classList.add('error');
            resultIcon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
            resultTitle.innerText = "Entry Denied";
            resultMeta.innerText = `Ticket already checked in for ${ev.title}.`;
            scanType.innerText = "Single Entry (Used)";
            scanCount.innerText = data.check_ins;
            return;
        }

        // APPROVE: Increment check-in
        const newCount = data.check_ins + 1;
        const { error: updateError } = await supabase
            .from('registrations')
            .update({ check_ins: newCount })
            .eq('ticket_id', ticketId);

        if (updateError) throw updateError;
        
        // LOG SCAN FOR ANALYTICS (Phase 10)
        // Note: As fail-safe we won't throw on analytics log crash to prevent halting the physical scanning queue
        await supabase.from('ticket_scans').insert({
            ticket_id: data.ticket_id,
            event_id: ev.id,
            scanned_by: currentUser.id
        });

        // SUCCESS
        resultCard.classList.add('success');
        resultIcon.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        resultTitle.innerText = "Entry Approved";
        resultMeta.innerText = `${userName} checked in for ${ev.title}.`;
        scanType.innerText = ev.ticket_type === 'single' ? "Single Entry" : "Multiple Entry";
        scanCount.innerText = newCount;
        
        // Clear input for next scan
        document.getElementById('ticket-input').value = "";

    } catch (err) {
        resultCard.classList.add('error');
        resultIcon.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
        resultTitle.innerText = "Verification Failed";
        resultMeta.innerText = err.message;
    }
}


// ===============================
// FILE UPLOADS
// ===============================

async function uploadBanner(file){
  const filePath = `banners/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
  .from("event-images")
  .upload(filePath, file);

  if(error){
    console.error(error);
    return null;
  }

  const { data } = supabase.storage
  .from("event-images")
  .getPublicUrl(filePath);

  return data.publicUrl;
}


// ===============================
// REALTIME SUBSCRIPTION
// ===============================

function subscribeRealtime(){
  supabase
  .channel("events-channel")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "events" },
    payload => {
      console.log("Realtime event update:", payload);
      loadEvents();
    }
  )
  .subscribe();
}


// ===============================
// PRELOADER & AUTO INIT
// ===============================


document.addEventListener("DOMContentLoaded", async () => {
  // If we are on dashboard or protected page, identify user eagerly
  const isDashboard = window.location.pathname.includes('dashboard.html');
  const isCreateEvent = window.location.pathname.includes('create-event.html');
  const isProfile = window.location.pathname.includes('profile.html');
  const isScan = window.location.pathname.includes('scan.html');
  
  if(isDashboard || isCreateEvent || isProfile || isScan) {
      await checkAuth(isCreateEvent); // Requires admin if on create-event page
  }

  try { loadEvents(); } catch(e){}
  try { loadDashboardStats(); } catch(e){}
  try { loadEventDetails(); } catch(e){}
  try { loadProfileData(); } catch(e){}
  try { subscribeRealtime(); } catch(e){}
});